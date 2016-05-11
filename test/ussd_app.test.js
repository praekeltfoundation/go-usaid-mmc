var vumigo = require("vumigo_v02");
var fixtures = require("./fixtures");
var AppTester = vumigo.AppTester;
var assert = require("assert");


describe("MMC App", function() {
    describe("USSD", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoApp();

            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: "test_app",
                    testing_today: "2015-05-03 06:07:08.999"
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                });
        });

        describe("Flow testing - ", function() {
            describe("(Language Choice & Main Menu)", function() {
                it("to state_select_language if number not registered", function() {
                    return tester
                        .start()
                        .check.interaction({
                            state: "state_select_language",
                            reply: [
                                "Welcome to MMC Service. Choose your language:",
                                "1. English",
                                "2. isiZulu",
                                "3. Sesotho",
                                "4. Siswati",
                                "5. isiNdebele",
                                "6. Setswana",
                                "7. isiXhosa",
                                "8. Xitsonga"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_main_menu after language is selected", function() {
                    return tester
                        .setup.user.state("state_select_language")
                        .input("1")
                        .check.interaction({
                            state: "state_main_menu"
                        })
                        .check(function() {
                            assert.strictEqual(
                                app.contact.extra.language_choice, "en");
                        })
                        .run();
                });
                it("to state_language_set if language preference changed", function() {
                    return tester
                        .setup.user.lang("en")
                        .setup.user.state("state_main_menu")
                        .inputs("4", "3", "2")
                        .check.interaction({
                            state: "state_language_set",
                            reply: [
                                "Your new language choice has been saved.",
                                "1. Main Menu",
                                "2. Exit",
                            ].join("\n"),
                        })
                        .check(function() {
                            assert.strictEqual(
                                app.contact.extra.language_choice, "zu");
                        })
                        .run();
                });
                it("to state_main_menu (page 1); straight to main menu for already registered user", function() {
                    return tester
                        .setup.user.lang("en")
                        .start()
                        .check.interaction({
                            state: "state_main_menu",
                            reply: [
                                "Medical Male Circumcision (MMC):",
                                "1. Find a clinic",
                                "2. Speak to an expert for FREE",
                                "3. Get FREE SMSs about your MMC recovery",
                                "4. More",
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_main_menu (page 2) after 'More' selected", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .input("4")
                        .check.interaction({
                            state: "state_main_menu",
                            reply: [
                                "Medical Male Circumcision (MMC):",
                                "1. Rate your clinic's MMC service",
                                "2. Join Brothers for Life",
                                "3. Change Language",
                                "4. Exit",
                                "5. Back",
                            ].join("\n")
                        })
                        .run();
                });
            });

            describe("(Find a Clinic)", function() {
                it("to state_healthsites (healthsites menu)", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .input("1")
                        .check.interaction({
                            state: "state_healthsites",
                            reply: [
                                "Welcome to Healthsites. What type of clinic are"
                                + " you looking for?",
                                "1. Nearest Clinic",
                                "2. MMC Clinic",
                                "3. HCT Clinic"
                            ].join("\n")
                        })
                        .run();
                });
            });

            describe("(Speak to Expert)", function() {

            });

            describe("(Post OP SMS Registration)", function() {
                it("to state_op", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .input("3")
                        .check.interaction({
                            state: "state_op",
                            reply: [
                                "We need to know when you had your MMC to send you "
                                + "the correct SMSs. Please select:",
                                "1. Today",
                                "2. Yesterday",
                                "3. May '15",
                                "4. April '15",
                                "5. March '15",
                                "6. I haven't had my operation yet"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_pre_op", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "6")
                        .check.interaction({
                            state: "state_pre_op",
                            reply: [
                                "Thank you for your interest in MMC. Unfortunately, you can"
                                + " only register once you have had your operation.",
                                "1. Main Menu",
                                "2. Exit"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_consent (menu options 1 & 2)", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "1")
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "Do you consent to:\n"
                                + "- Receiving some SMSs on public holidays, "
                                + "weekends & before 8am?\n"
                                + "- Having ur cell# & language info stored so we "
                                + "can send u SMSs?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_op_day (menu option 3,4,5)", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "4")
                        .check.interaction({
                            state: "state_op_day",
                            reply: "Please input the day you had your operation. "
                                + "For example, 12."
                        })
                        .run();
                });
                it("to state_6week_notice; op date >= 6 weeks ago", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "5", "13")
                        .check.interaction({
                            state: "state_6week_notice",
                            reply: [
                                "We only send SMSs up to 6 wks after MMC. Visit "
                                + "the clinic if you aren't healed. If you'd like "
                                + "to hear about events & services from Brothers "
                                + "for Life?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_consent; op date < 6 weeks ago", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "4", "5")
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "Do you consent to:",
                                "- Receiving some SMSs on public holidays, "
                                + "weekends & before 8am?",
                                "- Having ur cell# & language info stored so we can"
                                + " send u SMSs?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_bfl_join", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "5", "13", "1")
                        .check.interaction({
                            state: "state_bfl_join",
                            reply: [
                                "Thank you. You will now receive Brothers for" +
                                " Life updates. You can opt out at any" +
                                " point by replying STOP to an SMS you receive.",
                                "1. Main Menu",
                                "2. Exit"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_bfl_no_join", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "5", "13", "2")
                        .check.interaction({
                            state: "state_bfl_no_join",
                            reply: [
                                "You have selected not to receive Brothers for" +
                                " Life updates. You can join any time in" +
                                " the future by dialling *120*662#.",
                                "1. Main Menu",
                                "2. Exit"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_main_menu (page 1) via BFL state", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "5", "13", "2", "1")
                        .check.interaction({
                            state: "state_main_menu",
                            reply: [
                                "Medical Male Circumcision (MMC):",
                                "1. Find a clinic",
                                "2. Speak to an expert for FREE",
                                "3. Get FREE SMSs about your MMC recovery",
                                "4. More",
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_consent_withheld (flow from main menu options 1 & 2)", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "1", "2")
                        .check.interaction({
                            state: "state_consent_withheld",
                            reply: [
                                "Without your consent, we cannot send you messages.",
                                "1. Main Menu",
                                "2. Back",
                                "3. Exit"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end via state_consent_withheld", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "1", "2", "3")
                        .check.interaction({
                            state: "state_end",
                            reply: "Thanks for using the *120*662# MMC service! "
                                + "Dial back anytime to find MMC clinics, sign up "
                                + "for healing SMSs or find more info about MMC "
                                + "(20c/20sec) Yenzakahle!"
                        })
                        .run();
                });
                it("to state_consent via state_consent_withheld", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("3", "1", "2", "2")
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "Do you consent to:\n"
                                + "- Receiving some SMSs on public holidays, "
                                + "weekends & before 8am?\n"
                                + "- Having ur cell# & language info stored so we "
                                + "can send u SMSs?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
            });

            describe("(Service rating)", function() {
                it("to state_servicerating_location", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("4", "1")
                        .check.interaction({
                            state: "state_servicerating_location",
                            reply: [
                                "At which clinic did you get circumcised? Please",
                                " be specific with the name and location. e.g.",
                                " Peterville Clinic, Rivonia, Johannesburg."
                            ].join("")
                        })
                        .run();
                });
                it("to state_servicerating_would_recommend", function() {
                    return tester
                        .setup.user.state("state_servicerating_location")
                        .inputs("User entered location")
                        .check.interaction({
                            state: "state_servicerating_would_recommend",
                            reply: [
                                "Would you recommend a friend to the clinic" +
                                " where you got circumcised?",
                                "1. Yes",
                                "2. No",
                                "3. I have not been circumcised"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_servicerating_end_negative", function() {
                    return tester
                        .setup.user.state("state_servicerating_location")
                        .inputs("User entered location", "3")
                        .check.interaction({
                            state: "state_servicerating_end_negative",
                            reply: [
                                "Thank you for your interest. We are only looking" +
                                " for ratings from men who have had" +
                                " their circumcision at a clinic recently.",
                                "1. Main Menu",
                                "2. Exit"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_servicerating_rating", function() {
                    return tester
                        .setup.user.state("state_servicerating_location")
                        .inputs("User entered location", "1")
                        .check.interaction({
                            state: "state_servicerating_rating",
                            reply: [
                                "How would you rate the attitude of the health" +
                                " care workers at the clinic where you got " +
                                "circumcised?",
                                "1. Very bad",
                                "2. Bad",
                                "3. OK",
                                "4. Good",
                                "5. Excellent"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_servicerating_subscribed_to_post_op_sms", function() {
                    return tester
                        .setup.user.state("state_servicerating_location")
                        .inputs("User entered location", "1", "3")
                        .check.interaction({
                            state: "state_servicerating_subscribed_to_post_op_sms",
                            reply: [
                                "Did you subscribe to the post op SMS service?",
                                "1. Yes I found it helpful",
                                "2. Yes but it was not helpful",
                                "3. No I chose not to subscribe",
                                "4. I didn't know about it"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_servicerating_end_positive", function() {
                    return tester
                        .setup.user.state("state_servicerating_location")
                        .inputs("User entered location", "1", "5", "1")
                        .check.interaction({
                            state: "state_servicerating_end_positive",
                            reply: [
                                "Thanks for rating your circumcision experience." +
                                " We appreciate your feedback, it will" +
                                " help us improve our MMC service.",
                                "1. Main Menu",
                                "2. Exit"
                            ].join("\n")
                        })
                        .check(function(api, im) {
                            assert.deepEqual(im.user.answers, {
                                "state_servicerating_location":
                                    "User entered location",
                                "state_servicerating_would_recommend":
                                    "servicerating_yes_recommend",
                                "state_servicerating_rating":
                                    "servicerating_excellent",
                                "state_servicerating_subscribed_to_post_op_sms":
                                    "servicerating_subscribed_helpful"
                            });
                        })
                        .run();
                });
            });

            describe("(Brothers for Life)", function() {
                it("to state_bfl_start", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("4", "2")
                        .check.interaction({
                            state: "state_bfl_start",
                            reply: [
                                "Join Brothers for Life and we'll send you " +
                                "free SMSs about ur health, upcoming events & " +
                                "services for men. brothersforlife.org T&Cs " +
                                "apply.",
                                "1. Join",
                                "2. No thanks"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_bfl_join", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("4", "2", "1")
                        .check.interaction({
                            state: "state_bfl_join",
                            reply: [
                                "Thank you. You will now receive Brothers for" +
                                " Life updates. You can opt out at any" +
                                " point by replying STOP to an SMS you receive.",
                                "1. Main Menu",
                                "2. Exit"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_bfl_no_join", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("4", "2", "2")
                        .check.interaction({
                            state: "state_bfl_no_join",
                            reply: [
                                "You have selected not to receive Brothers for" +
                                " Life updates. You can join any time in" +
                                " the future by dialling *120*662#.",
                                "1. Main Menu",
                                "2. Exit"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end via decision to join", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("4", "2", "1", "2")
                        .check.interaction({
                            state: "state_end",
                            reply: "Thanks for using the *120*662# MMC service! "
                                + "Dial back anytime to find MMC clinics, sign up "
                                + "for healing SMSs or find more info about MMC "
                                + "(20c/20sec) Yenzakahle!"
                        })
                        .run();
                });
                it("to state_end via decision not to join", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("4", "2", "2", "2")
                        .check.interaction({
                            state: "state_end",
                            reply: "Thanks for using the *120*662# MMC service! "
                                + "Dial back anytime to find MMC clinics, sign up "
                                + "for healing SMSs or find more info about MMC "
                                + "(20c/20sec) Yenzakahle!"
                        })
                        .run();
                });
                it("to state_main_menu via state_bfl_join", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("4", "2", "1", "1")
                        .check.interaction({
                            state: "state_main_menu",
                            reply: [
                                "Medical Male Circumcision (MMC):",
                                "1. Find a clinic",
                                "2. Speak to an expert for FREE",
                                "3. Get FREE SMSs about your MMC recovery",
                                "4. More",
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_main_menu via state_bfl_no_join", function() {
                    return tester
                        .setup.user.state("state_main_menu")
                        .inputs("4", "2", "2", "1")
                        .check.interaction({
                            state: "state_main_menu",
                            reply: [
                                "Medical Male Circumcision (MMC):",
                                "1. Find a clinic",
                                "2. Speak to an expert for FREE",
                                "3. Get FREE SMSs about your MMC recovery",
                                "4. More",
                            ].join("\n")
                        })
                        .run();
                });
            });
        });
    });
});
