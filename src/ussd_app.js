go.app = function() {
    var vumigo = require('vumigo_v02');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var FreeText = vumigo.states.FreeText;
    var LanguageChoice = vumigo.states.LanguageChoice;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var EndState = vumigo.states.EndState;

    var GoApp = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;
        var interrupt = true;

        self.init = function() {

            self.im.on('session:close', function(e) {
                return self.dial_back(e);
            });

            self.im.on('state:enter', function(e) {
                self.im.metrics.fire.sum(['ussd', 'views', e.state.name].join('.'), 1);
            });

            // Use the metrics helper to add metrics
            mh = new MetricsHelper(self.im);
            mh
                // Total unique users
                .add.total_unique_users('ussd.unique_users')
                // Total sessions
                .add.total_sessions('ussd.sessions')
            ;

            // Fetch the contact from the contact store that matches the current
            // user's address. When we get the contact, we put the contact on
            // the app so we can reference it easily when creating each state.
            return self.im
                .contacts.for_user()
                .then(function(user_contact) {
                    self.contact = user_contact;
                });
        };

    // DIALBACK SMS HANDLING

        self.should_send_dialback = function(e) {
            return e.user_terminated
                && !go.utils.is_true(self.contact.extra.redial_sms_sent);
        };

        self.send_dialback = function() {
            return self.im.outbound
                .send_to_user({
                    endpoint: 'sms',
                    content: self.get_dialback_sms()
                })
                .then(function() {
                    self.contact.extra.redial_sms_sent = 'true';
                    return Q.all([
                        self.im.contacts.save(self.contact),
                        self.im.metrics.fire.sum('ussd.timeout_sms.sent', 1)
                    ]);
                });
        };

        self.dial_back = function(e) {
            if (!self.should_send_dialback(e)) { return; }
            return self.send_dialback();
        };

        self.get_dialback_sms = function() {
            return $("Thanks for using the {{channel}} MMC service! Dial back "
                + "anytime to find MMC clinics, sign up for free SMSs about "
                + "men's health or speak to a MMC expert (20c/20sec)")
                .context({
                    channel: self.im.config.channel
                });
        };



    // TIMEOUT HANDLING

        // determine whether timed_out state should be used
        self.timed_out = function() {
            var no_redirects = [

            ];

            return self.im.msg.session_event === 'new'
                && self.im.user.state.name
                && no_redirects.indexOf(self.im.user.state.name) === -1;
        };

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (!interrupt || !self.timed_out(self.im))
                    return creator(name, opts);

                interrupt = false;
                var timeout_opts = opts || {};
                timeout_opts.name = name;
                return self.states.create('state_timed_out', timeout_opts);
            });
        };

        // timeout state
        self.states.add('state_timed_out', function(name, creator_opts) {
            //var readable_no = go.utils.readable_sa_msisdn(self.contact.msisdn);

            return new ChoiceState(name, {
                question: $("Welcome back to the Medical Male Circumcision (MMC"
                    + ") service. What would you like to do?"),
                choices: [
                    new Choice(creator_opts.name, $("Return to last screen "
                        +"visited")),
                    new Choice('state_main_menu', $("Main Menu")),
                    new Choice('state_end', $("Exit"))
                ],

                next: function(choice) {
                    return {
                        name: choice.value,
                        creator_opts: creator_opts
                    };
                }
            });
        });

        self.add('state_start', function(name) {
            if (!self.im.user.lang) {
                return self.states.create('state_select_language');
            } else {
                return self.states.create('state_main_menu');
            }
        });

        self.add('state_main_menu', function(name){
            return new PaginatedChoiceState(name, {
                question: $('Medical Male Circumcision (MMC):'),
                characters_per_page: 160,
                options_per_page: null,
                choices: [
                    /*** Clinic locator option disabled for now (CCI-33) ***
                     new Choice('state_healthsites', $('Find a clinic')),*/
                    new Choice('state_end', $('Speak to an expert for FREE')),
                    new Choice('state_op', $('Get FREE SMSs about your MMC recovery')),
                    new Choice('state_servicerating_location', $('Rate your clinic\'s MMC service')),
                    new Choice('state_bfl_start', $('Join Brothers for Life')),
                    new Choice('state_select_language', $('Change Language')),
                    new Choice('state_end', $('Exit')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_end', function(name) {
            return new EndState(name, {
                text: $([
                    "Thanks for using the *120*662# MMC service! Dial back",
                    " anytime to find MMC clinics, sign up for healing SMSs",
                    " or find more info about MMC (20c/20sec) Yenzakahle!",
                ].join("")),
                next: 'state_start'
            });
        });

        self.add('state_select_language', function(name){
            var language_previously_not_set = self.im.user.lang === null;
            return new LanguageChoice(name, {
                question: $("Welcome to MMC Service. Choose your language:"),
                choices: [
                    new Choice("en", $("English")),
                    new Choice("zu", $("isiZulu")),
                    new Choice("st", $("Sesotho")),
                    new Choice("ss", $("Siswati")),
                    new Choice("nd", $("isiNdebele")),
                    new Choice("tn", $("Setswana")),
                    new Choice("xh", $("isiXhosa")),
                    new Choice("ts", $("Xitsonga")),
                ],
                next: function(choice) {
                    var lang_choice = choice.value;
                    self.contact.extra.language_choice = lang_choice;
                    return self.im.contacts
                        .save(self.contact)
                        .then(function () {
                            if (language_previously_not_set) {
                                return self.im.metrics.fire
                                    .sum(['ussd', 'lang', lang_choice].join('.'), 1)
                                    .then(function() {
                                        return "state_main_menu";
                                    });
                            } else {
                                return go.utils
                                    .subscription_set_language(
                                        self.contact, self.im,
                                        self.contact.extra.language_choice)
                                    .then(function() {
                                        return 'state_language_set';
                                    });
                            }
                        });
                }
            });
        });

        self.add('state_language_set', function(name){
            return new ChoiceState(name, {
                question: $("Your new language choice has been saved."),
                choices: [
                    new Choice("state_main_menu", $("Main Menu")),
                    new Choice("state_end", $("Exit")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        /*** Clinic locator option disabled for now (CCI-33) ***
        self.add('state_healthsites', function(name){
            return new ChoiceState(name, {
                question: $([
                    "Welcome to Healthsites. What type of clinic are you",
                    " looking for?",
                ].join("")),
                choices: [
                    new Choice("state_end", $("Nearest Clinic")),
                    new Choice("state_end", $("MMC Clinic")),
                    new Choice("state_end", $("HCT Clinic")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });*/

        // ChoiceState st-F1
        self.states.add('state_op', function(name) {
            var today = go.utils.get_today(self.im.config);
            var month_choice = go.utils.make_month_choices($, today, 3, -1, "YYYYMM", "MMMM 'YY");
            return new ChoiceState(name, {
                question: $([
                    "We need to know when you had your MMC to send you the ",
                    "correct SMSs. Please select:",
                ].join("")),
                choices: [
                    new Choice("state_consent", $("Today")),
                    new Choice("state_consent", $("Yesterday")),
                    month_choice[0],
                    month_choice[1],
                    month_choice[2],
                    new Choice("state_pre_op", $("I haven't had my operation yet"))
                ],
                next: function(choice) {
                    if (choice.value === "state_consent" ||
                        choice.value === "state_pre_op") {

                        return choice.value;
                    } else {
                        return {
                            name: "state_op_day",
                            creator_opts: choice.value
                        };
                    }
                }
            });
        });

        // FreeText st-F2
        self.states.add('state_op_day', function(name, year_month) {
            return new FreeText(name, {
                question: $([
                    "Please input the day you had your operation. For example, ",
                    "12."
                ].join("")),
                next: function(day) {
                    // add a zero to input if a single-digit number
                    if (day.length == 1) day = "0" + day;
                    var date_of_op = year_month+day;
                    self.contact.extra.date_of_op = date_of_op;  //YYYYMMDD

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            if (go.utils.is_date_diff_less_than_x_weeks(self.im, date_of_op, 6)) {
                                return "state_consent";
                            } else {
                                return "state_6week_notice";
                            }
                        });
                }
            });
        });

        // ChoiceState st-F3
        self.states.add('state_consent', function(name) {
            return new ChoiceState(name, {
                question: $([
                    "Do you consent to:",
                    "- Receiving some SMSs on public holidays, weekends & "
                    + "before 8am?",
                    "- Having ur cell# & language info stored so we can send u"
                    + " SMSs?"
                ].join('\n')),
                choices: [
                    new Choice("state_save_and_subscribe", $("Yes")),
                    new Choice("state_consent_withheld", $("No"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // ChoiceState st-F4
        self.states.add('state_pre_op', function(name) {
            return new ChoiceState(name, {
                question: $("Thank you for your interest in MMC. Unfortunately,"
                    + " you can only register once you have had your "
                    + "operation."),
                choices: [
                    new Choice("state_main_menu", $("Main Menu")),
                    new Choice("state_end", $("Exit"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // ChoiceState st-F5
        self.states.add('state_6week_notice', function(name) {
            return new ChoiceState(name, {
                question: $([
                    "We only send SMSs up to 6 wks after MMC. Visit the clinic ",
                    "if you aren't healed. If you'd like to hear about ",
                    "events & services from Brothers for Life?"
                ].join("")),
                choices: [
                    new Choice("state_bfl_join", $("Yes")),
                    new Choice("state_bfl_no_join", $("No"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // ChoiceState st-F6
        self.states.add('state_consent_withheld', function(name) {
            return new ChoiceState(name, {
                question: $([
                    "Without your consent, we cannot send you messages."
                ].join("")),
                choices: [
                    new Choice("state_main_menu", $("Main Menu")),
                    new Choice("state_consent", $("Back")),
                    new Choice("state_end", $("Exit"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // interstitial
        self.states.add('state_save_and_subscribe', function(name) {
            if (self.contact.extra.language_choice === undefined) {
                // default to english if not yet defined
                self.contact.extra.language_choice = "en";
            }

            var lang_choice = self.contact.extra.language_choice;

            return go.utils
                .subscription_subscribe(self.contact, self.im, lang_choice)
                .then(function() {
                    self.contact.extra.is_registered = "true";
                    self.contact.extra.consent = "true";

                    return Q
                        .all([
                            self.im.user.set_lang(self.contact.extra.language_choice),
                            self.im.metrics.fire.sum(['ussd', 'post_op', 'registrations'].join('.'), 1)
                        ])
                        .then(function() {
                            self.im.contacts.save(self.contact);
                            return self.states.create('state_end_registration');
                        });
                });
        });

        self.states.add('state_end_registration', function(name) {
            return new EndState(name, {
                text: $([
                    "Thank you. You are now subscrbd to MMC msgs. Remember if ",
                    "u hav prolonged pain, visit ur nearest clinic. Call ",
                    "0800212685 or send a please call me to 0828816202",
                ].join("")),
                next: 'state_start'
            });
        });

        self.add('state_servicerating_location', function(name){
            self.im.user.answers = {};
            return new FreeText(name, {
                question: $([
                    "At which clinic did you get circumcised? Please be",
                    " specific with the name and location. e.g. Peterville",
                    " Clinic, Rivonia, Johannesburg.",
                ].join("")),
                next: function(text) {
                    return 'state_servicerating_would_recommend';
                }
            });
        });

        self.add('state_servicerating_would_recommend', function(name){
            return new ChoiceState(name, {
                question: $([
                    "Would you recommend a friend to the clinic where you",
                    " got circumcised?",
                ].join("")),
                choices: [
                    new Choice("servicerating_yes_recommend", $("Yes")),
                    new Choice("servicerating_no_recommend", $("No")),
                    new Choice(
                        "servicerating_not_circumcised",
                        $("I have not been circumcised"))
                ],
                next: function(choice) {
                    if (choice.value === 'servicerating_not_circumcised') {
                        return 'state_servicerating_end_negative';
                    } else {
                        return 'state_servicerating_rating';
                    }
                }
            });
        });

        self.add('state_servicerating_rating', function(name){
            return new ChoiceState(name, {
                question: $([
                    "How would you rate the attitude of the health care",
                    " workers at the clinic where you got circumcised?",
                ].join("")),
                choices: [
                    new Choice("servicerating_very_bad", $("Very bad")),
                    new Choice("servicerating_bad", $("Bad")),
                    new Choice("servicerating_ok", $("OK")),
                    new Choice("servicerating_good", $("Good")),
                    new Choice("servicerating_excellent", $("Excellent")),
                ],
                next: function(choice) {
                    return 'state_servicerating_subscribed_to_post_op_sms';
                }
            });
        });

        self.add('state_servicerating_subscribed_to_post_op_sms',
        function(name){
            return new ChoiceState(name, {
                question: $("Did you subscribe to the post op SMS service?"),
                choices: [
                    new Choice(
                        "servicerating_subscribed_helpful",
                        $("Yes I found it helpful")),
                    new Choice(
                        "servicerating_subscribed_not_helpful",
                        $("Yes but it was not helpful")),
                    new Choice(
                        "servicerating_not_subscribed",
                        $("No I chose not to subscribe")),
                    new Choice(
                        "servicerating_did_not_know",
                        $("I didn't know about it")),
                ],
                next: function(choice) {
                    return 'state_servicerating_end_positive';
                }
            });
        });

        self.add('state_servicerating_end_positive', function(name){
            return new ChoiceState(name, {
                question: $([
                    "Thanks for rating your circumcision experience. We",
                    " appreciate your feedback, it will help us improve our",
                    " MMC service.",
                ].join("")),
                choices: [
                    new Choice("state_main_menu", $("Main Menu")),
                    new Choice("state_end", $("Exit"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_servicerating_end_negative', function(name){
            return new ChoiceState(name, {
                question: $([
                    "Thank you for your interest. We are only looking for",
                    " ratings from men who have had their circumcision at a",
                    " clinic recently.",
                ].join("")),
                choices: [
                    new Choice("state_main_menu", $("Main Menu")),
                    new Choice("state_end", $("Exit"))
                ],
                next: function(choice) {
                    // TODO make web request to store results
                    return choice.value;
                }
            });
        });

        self.add('state_bfl_start', function(name){
            return new ChoiceState(name, {
                question: $([
                    "Join Brothers for Life and we'll send you free SMSs",
                    " about ur health, upcoming events & services for men.",
                    " brothersforlife.org T&Cs apply.",
                ].join("")),
                choices: [
                    new Choice("state_bfl_join", $("Join")),
                    new Choice("state_bfl_no_join", $("No thanks"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_bfl_join', function(name){
            return new ChoiceState(name, {
                question: $([
                    "Thank you. You will now receive Brothers for Life",
                    " updates. You can opt out at any point by replying STOP",
                    " to an SMS you receive.",
                ].join("")),
                choices: [
                    new Choice("state_main_menu", $("Main Menu")),
                    new Choice("state_end", $("Exit")),
                ],
                next: function(choice) {
                    self.contact.extra.bfl_member = "true";
                    return self.im.groups
                        .get("bfl")
                        .then(function(group) {
                            self.contact.groups.push(group.key);
                            return Q
                                .all([
                                    self.im.contacts.save(self.contact),
                                    self.im.metrics.fire.sum(['ussd', 'joined', 'bfl'].join('.'), 1)
                                ])
                                .then(function() {
                                    return choice.value;
                                });
                        });
                }
            });
        });

        self.add('state_bfl_no_join', function(name){
            return new ChoiceState(name, {
                question: $([
                    "You have selected not to receive Brothers for Life",
                    " updates. You can join any time in the future by",
                    " dialling *120*662#.",
                ].join("")),
                choices: [
                    new Choice("state_main_menu", $("Main Menu")),
                    new Choice("state_end", $("Exit")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
    });

    return {
        GoApp: GoApp
    };
}();
