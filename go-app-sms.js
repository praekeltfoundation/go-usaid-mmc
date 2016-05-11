// WARNING: This is a generated file.
//          If you edit it you will be sad.
//          Edit src/app.js instead.

var go = {};
go;

/*jshint -W083 */
var moment = require('moment');
var vumigo = require('vumigo_v02');
var Choice = vumigo.states.Choice;
var HttpApi = vumigo.http.api.HttpApi;

go.utils = {
    // DATE HELPERS

    get_today: function(config) {
        if (config.testing_today) {
        return new moment(config.testing_today, 'YYYY-MM-DD');
        } else {
        return new moment();
        }
    },

    make_month_choices: function($, startDate, limit, increment, valueFormat, labelFormat) {
      // Currently supports month translation in formats MMMM and MM

        var choices = [];
        var monthIterator = startDate;
        for (var i=0; i<limit; i++) {
        var raw_label = monthIterator.format(labelFormat);
        var prefix, suffix, month, translation;

        var quad_month_index = labelFormat.indexOf("MMMM");
        var trip_month_index = labelFormat.indexOf("MMM");

        if (quad_month_index > -1) {
            month = monthIterator.format("MMMM");
            prefix = raw_label.substring(0, quad_month_index);
            suffix = raw_label.substring(quad_month_index+month.length, raw_label.length);
            translation = {
            January: $("{{pre}}January{{post}}"),
            February: $("{{pre}}February{{post}}"),
            March: $("{{pre}}March{{post}}"),
            April: $("{{pre}}April{{post}}"),
            May: $("{{pre}}May{{post}}"),
            June: $("{{pre}}June{{post}}"),
            July: $("{{pre}}July{{post}}"),
            August: $("{{pre}}August{{post}}"),
            September: $("{{pre}}September{{post}}"),
            October: $("{{pre}}October{{post}}"),
            November: $("{{pre}}November{{post}}"),
            December: $("{{pre}}December{{post}}"),
            };
            translated_label = translation[month].context({
            pre: prefix,
            post: suffix
            });
        } else if (trip_month_index > -1) {
            month = monthIterator.format("MMM");
            prefix = raw_label.substring(0, trip_month_index);
            suffix = raw_label.substring(trip_month_index+month.length, raw_label.length);
            translation = {
            Jan: $("{{pre}}Jan{{post}}"),
            Feb: $("{{pre}}Feb{{post}}"),
            Mar: $("{{pre}}Mar{{post}}"),
            Apr: $("{{pre}}Apr{{post}}"),
            May: $("{{pre}}May{{post}}"),
            Jun: $("{{pre}}Jun{{post}}"),
            Jul: $("{{pre}}Jul{{post}}"),
            Aug: $("{{pre}}Aug{{post}}"),
            Sep: $("{{pre}}Sep{{post}}"),
            Oct: $("{{pre}}Oct{{post}}"),
            Nov: $("{{pre}}Nov{{post}}"),
            Dec: $("{{pre}}Dec{{post}}"),
            };
            translated_label = translation[month].context({
            pre: prefix,
            post: suffix
            });
        } else {
            // assume numbers don't need translation
            translated_label = raw_label;
        }

        choices.push(new Choice(monthIterator.format(valueFormat),
                    translated_label));
        monthIterator.add(increment, 'months');
        }

        return choices;
    },

    // date parameter being a date string in YYYYMMDD format
    // x being the number of weeks to check against
    is_date_diff_less_than_x_weeks: function(im, date, x) {
        var today = go.utils.get_today(im.config);
        var d = new moment(date, 'YYYYMMDD');

        return today.diff(d, "weeks") < x;
    },

    // OPT-OUT HELPERS

    opt_out: function(im, contact) {
        return im.api_request('optout.optout', {
            address_type: "msisdn",
            address_value: contact.msisdn,
            message_id: im.msg.message_id
        });
    },

    opted_out: function(im, contact) {
            return im.api_request('optout.status', {
            address_type: "msisdn",
            address_value: contact.msisdn
        });
    },

    opt_in: function(im, contact) {
            return im.api_request('optout.cancel_optout', {
            address_type: "msisdn",
            address_value: contact.msisdn
        });
    },

    // CONTROL API CALL HELPERS

    control_api_call: function (method, params, payload, endpoint, im) {
        var http = new HttpApi(im, {
          headers: {
            'Content-Type': ['application/json'],
            'Authorization': ['ApiKey ' + im.config.control.username + ':' + im.config.control.api_key]
          }
        });
        switch (method) {
            case "post":
                return http.post(im.config.control.url + endpoint, {
                    data: JSON.stringify(payload)
                });
            case "get":
                return http.get(im.config.control.url + endpoint, {
                    params: params
                });
            case "patch":
                return http.patch(im.config.control.url + endpoint, {
                    data: JSON.stringify(payload)
                });
            case "put":
                return http.put(im.config.control.url + endpoint, {
                    params: params,
                    data: JSON.stringify(payload)
                });
            case "delete":
                return http.delete(im.config.control.url + endpoint);
        }
    },

    // SUBSCRIPTION HELPERS

    subscription_completed: function(contact, im) {
        var params = {
        to_addr: contact.msisdn
        };
        return go.utils
        .control_api_call("get", params, null, 'subscription/', im)
        .then(function(json_result) {
            var parsed_data = JSON.parse(json_result.data);
            var all_completed = true;
            for (i=0; i<parsed_data.objects.length; i++) {
                if (parsed_data.objects[i].completed === false) {
                    all_completed = false;
                }
            }
            return all_completed;
        });
    },

    subscription_unsubscribe_all: function(contact, im) {
        var params = {
        to_addr: contact.msisdn
        };
        return go.utils
        .control_api_call("get", params, null, 'subscription/', im)
        .then(function(json_result) {
            // make all subscriptions inactive
            var update = JSON.parse(json_result.data);
            var clean = true;
            for (i=0;i<update.objects.length;i++) {
                if (update.objects[i].active === true){
                    update.objects[i].active = false;
                    clean = false;
                }
            }
            if (!clean) {
                return go.utils.control_api_call("patch", {}, update, 'subscription/', im);
            } else {
                return Q();
            }

        });
    },

    subscription_set_language: function(contact, im, lang) {
        var params = {
            to_addr: contact.msisdn
        };
        return go.utils
            .control_api_call("get", params, null, 'subscription/', im)
            .then(function(json_result) {
                // make all subscriptions inactive
                var update = JSON.parse(json_result.data);
                var clean = true;
                var patch_url;

                if (update.objects.length === 1) {
                if (update.objects[0].lang !== lang) {
                    patch_url = 'subscription/' + update.objects[0].id;
                    clean = false;
                    update = {
                        "lang": lang
                    };
                }
                } else if (update.objects.length >= 1) {
                for (i=0; i<update.objects.length; i++) {
                    if (update.objects[i].lang !== lang){
                        update.objects[i].lang = lang;
                        clean = false;
                        patch_url = 'subscription/';
                    }
                }
                }

                if (!clean) {
                    return go.utils.control_api_call("patch", {}, update, patch_url, im);
                } else {
                    return Q();
                }

            });
        },

        subscription_subscribe: function(contact, im) {
            var payload = {
              contact_key: contact.key,
              lang: 'en',
              message_set: "/subscription/api/v1/message_set/12/",
              next_sequence_number: 2,
              schedule: "/subscription/api/v1/periodic_task/1/",
              to_addr: contact.msisdn,
              user_account: contact.user_account
            };
            return go.utils.control_api_call("post", null, payload, 'subscription/', im);
        },
};

go.app = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;

    var GoApp = App.extend(function(self) {
        App.call(self, 'states_start');
        var $ = self.$;
        var interrupt = true;

        self.init = function() {

            // Use the metrics helper to add the required metrics
            mh = new MetricsHelper(self.im);
            mh
                // Total unique users
                .add.total_unique_users('sum.unique_users')

                // Total registrations
                .add.total_state_actions(
                    {
                        state: 'states_language',
                        action: 'enter'
                    },
                    'sum.registrations'
                )

                // Total opt outs
                .add.total_state_actions(
                    {
                        state: 'states_unsubscribe',
                        action: 'enter'
                    },
                    'sum.optouts'
                );

            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };


        self.get_clean_first_word = function() {
            return self.im.msg.content
                .split(" ")[0]          // split off first word
                .replace(/\W/g, '')     // remove non letters
                .toUpperCase();         // capitalise
        };


        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                var first_word = self.get_clean_first_word();

                // if first word is not BLOCK or STOP, continue as normal
                // prevent recurring loop with interrupt
                if (!interrupt ||
                    !(first_word === 'BLOCK' || first_word === 'STOP')) {
                    return creator(name, opts);
                }

                interrupt = false;
                opts = opts || {};
                opts.name = name;
                return self.states.create('states_opt_out', opts);
            });
        };


        self.states.add('states_opt_out', function(name) {
            // run opt-out calls
            return go.utils
                .opt_out(self.im, self.contact)
                .then(function() {
                    return go.utils
                        .subscription_unsubscribe_all(self.contact, self.im)
                        .then(function() {
                            return self.states.create('states_unsubscribe');
                        });
                });
        });

        self.states.add('states_unsubscribe', function(name) {
            return new EndState(name, {
                text:
                    $("You have been unsubscribed."),

                next: 'states_start'
            });
        });


        self.add('states_start', function(name) {
            var first_word = self.get_clean_first_word();

            // always subscribe on start or unblock
            if (first_word === "START" || first_word === "UNBLOCK") {
                return self.states.create('states_opt_in');

            // user isn't registered
            } else if (_.isUndefined(self.contact.extra.is_registered) ||
                            self.contact.extra.is_registered === 'false') {
                if (first_word === "MMC") {
                    return self.states.create('states_register_english');
                } else {
                    return self.states.create('states_how_to_register');
                }

            // user is registered
            } else if (self.contact.extra.is_registered === 'true') {
                return go.utils
                    .subscription_completed(self.contact, self.im)
                    .then(function(messages_completed) {
                        if (messages_completed === true) {
                            return self.states.create('states_finished_messages');
                        } else {
                            return self.states.create('states_unfinished_messages');
                        }
                    });
            }
        });

        self.add('states_register_english', function(name) {
            return go.utils
                .subscription_subscribe(self.contact, self.im)
                .then(function() {
                    return self.states.create('states_language');
                });
        });

        self.add('states_language', function(name) {
            return new ChoiceState(name, {
                question:
                    "You're registered for messages about your circumcision! " +
                    "The wound will heal in 6 weeks. Do not have sex for 6 weeks to " +
                    "prevent infecting or damaging the wound. Avoid smoking, alcohol " +
                    "and drugs. Keep your penis upright for 7 - 10 days, until the " +
                    "swelling goes down. Wear clean underwear every day. Briefs, not " +
                    "boxers. Don't worry if some blood stains the bandage. If blood " +
                    "soaks the bandage, go to the clinic immediately. " +
                    "If you'd like messages in another language, reply with the " +
                    "number of your language",

                choices: [
                    new Choice('xh', $("Xhosa")),
                    new Choice('zu', $("Zulu")),
                    new Choice('st', $("Sotho")),
                    new Choice('af', $("Afrikaans")),
                ],

                next: function(choice) {
                    self.contact.extra.language_choice = choice.value;

                    return self.im.user
                        .set_lang(choice.value)
                        .then(function() {
                            return self.im.contacts.save(self.contact);
                        })
                        .then(function() {
                            return 'states_update_language';
                        });
                },

                events: {
                    'state:enter': function() {
                        self.contact.extra.is_registered = 'true';

                        return self.im.user
                            .set_lang('en')
                            .then(function() {
                                return self.im.contacts.save(self.contact);
                            });
                    }
                }
            });
        });

        self.add('states_update_language', function(name) {
            // update subscription to language of choice
            return go.utils
                .subscription_set_language(self.contact, self.im, self.contact.extra.language_choice)
                .then(function() {
                     return self.states.create('states_update_language_success');
                });
        });

        self.add('states_update_language_success', function(name) {
            return new EndState(name, {
                text:
                    $("The wound will heal in 6 weeks. Do not have sex for 6 weeks to " +
                      "prevent infecting or damaging the wound. Avoid smoking, alcohol " +
                      "and drugs.  Keep your penis upright for 7 - 10 days, until the " +
                      "swelling goes down. Wear clean underwear every day. Briefs, not " +
                      "boxers. Don't worry if some blood stains the bandage. If blood " +
                      "soaks the bandage, go to the clinic immediately."),

                next: 'states_start'
            });
        });

        self.add('states_how_to_register', function(name) {
            return new EndState(name, {
                text:
                    $("Welcome to the Medical Male Circumcision (MMC) info service. To get " +
                    "FREE info on how to look after your circumcision wound please SMS 'MMC' " +
                    "to {{SMS_number}}."
                    ).context({
                        SMS_number: self.im.config.channel
                    }),

                next: 'states_start'
            });
        });

        self.add('states_finished_messages', function(name) {
            return new EndState(name, {
                text:
                    $("You have finished your set of SMSs and your circumcision wound should " +
                    "be healed. If not, please visit your local clinic. Thanks for using " +
                    "the MMC info service."),

                next: 'states_start'
            });
        });

        self.add('states_unfinished_messages', function(name) {
            return new EndState(name, {
                text:
                    $("MMC info: U r registered to receive SMSs about ur circumcision. " +
                    "To opt out SMS 'STOP' to {{SMS_number}}. If u have concerns with ur " +
                    "wound please visit ur local clinic."
                    ).context({
                        SMS_number: self.im.config.channel
                    }),

                next: 'states_start'
            });
        });

        self.add('states_opt_in', function(name) {
            // run opt-in calls
            return go.utils
                .opt_in(self.im, self.contact)
                .then(function() {
                    return self.states.create('states_optedin');
                });
        });

        self.add('states_optedin', function(name) {
            return new EndState(name, {
                text:
                    $("You are now able to resubscribe. " +
                      "Please SMS 'MMC' to {{SMS_number}} to continue").context({
                        SMS_number: self.im.config.channel
                    }),

                next: 'states_start'
            });
        });

    });

    return {
        GoApp: GoApp
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoApp = go.app.GoApp;


    return {
        im: new InteractionMachine(api, new GoApp())
    };
}();
