var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var assert = require('assert');


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
                    name: 'test_app',
                    testing_today: '2015-05-03 06:07:08.999'
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                });
        });

        describe("when the user starts a session without being registered", function() {
            it("should ask to select language for future sessions", function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'state_select_language',
                        reply: [
                            'Welcome to MMC Service. Choose your language:',
                            '1. English',
                            '2. isiZulu',
                            '3. Sesotho',
                            '4. Siswati',
                            '5. isiNdebele',
                            '6. Setswana',
                            '7. isiXhosa',
                            '8. Xitsonga'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the user selects a language", function() {
            it("should save result to contact and display the main menu", function() {
                return tester
                    .setup.user.state('state_select_language')
                    .input('1')
                    .check.interaction({
                        state: 'state_main_menu'
                    })
                    .check(function(api, im, app) {
                        assert.strictEqual(
                            app.contact.extra.language_choice, 'en');
                    })
                    .run();
            });
        });

        describe("when the user changes their language", function() {
            it("should save the new langauge to the contact and notify the user of the change", function() {
                return tester
                    .setup.user.lang('en')
                    .setup.user.state('state_main_menu')
                    .inputs('4', '3', '2')
                    .check.interaction({
                        state: 'state_language_set',
                        reply: [
                            "Your new language choice has been saved.",
                            "1. Main Menu",
                            "2. Exit",
                        ].join("\n"),
                    })
                    .check(function(api, im, app) {
                        assert.strictEqual(
                            app.contact.extra.language_choice, 'zu');
                    })
                    .run();
            });
        });

        describe("when the user starts a session after having set a language", function() {
            it("should show the main menu", function() {
                return tester
                    .setup.user.lang('en')
                    .start()
                    .check.interaction({
                        state: 'state_main_menu',
                        reply: [
                            'Medical Male Circumcision (MMC):',
                            '1. Find a clinic',
                            '2. Speak to an expert for FREE',
                            '3. Get FREE SMSs about your MMC recovery',
                            '4. More',
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when next is selected on main menu page 1", function() {
            it("should show the main menu page 2", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .input('4')
                    .check.interaction({
                        state: 'state_main_menu',
                        reply: [
                            'Medical Male Circumcision (MMC):',
                            '1. Rate your clinic\'s MMC service',
                            '2. Join Brothers for Life',
                            '3. Change Language',
                            '4. Exit',
                            '5. Back',
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when user selects 'Find a clinic'", function() {
            it("should show the healthsites menu", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .input('1')
                    .check.interaction({
                        state: 'state_healthsites',
                        reply: [
                            'Welcome to Healthsites. What type of clinic are'
                            + ' you looking for?',
                            '1. Nearest Clinic',
                            '2. MMC Clinic',
                            '3. HCT Clinic'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when user selects 'Get FREE SMSs about your MMC recovery'", function() {
            it("should respond with asking when op was done", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .input('3')
                    .check.interaction({
                        state: 'state_op',
                        reply: [
                            "We need to know when you had your MMC to send you "
                            + "the correct SMSs. Please select:",
                            "1. Today",
                            "2. Yesterday",
                            "3. May '15",
                            "4. June '15",
                            "5. July '15",
                            "6. I haven't had my operation yet"
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when user selects 'I haven't had my operation yet'", function() {
            it("should respond with stating registration is only possible after op", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .inputs('3', '6')
                    .check.interaction({
                        state: 'state_pre_op',
                        reply: [
                            "Thank you for your interest in MMC. Unfortunately, you can"
                            + " only register once you have had your operation.",
                            "1. Main Menu",
                            "2. Exit"
                        ].join('\n')
                    })
                    .run();
            });
        });

        /*describe("when user selects 'Get FREE SMSs about your MMC recovery'", function() {
            it("should respond with asking when op was done", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .input('3', '6')
                    .check.interaction({
                        state: 'state_op',
                        reply: [
                            "We need to know when you had your MMC to send you "
                            + "the correct SMSs. Please select:",
                            "1. I haven't had my operation yet",
                            "2. Back"
                        ].join('\n')
                    })
                    .run();
            });
        });*/

        describe("when user selects option 1 or 2", function() {
            it("should respond with 'Do u consent to'", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .inputs('3', '1')
                    .check.interaction({
                        state: 'state_consent',
                        reply: [
                            "Do you consent to:\n"
                            + "- Receiving some SMSs on public holidays, "
                            + "weekends & before 8am?\n"
                            + "- Having ur cell# & language info stored so we "
                            + "can send u SMSs?",
                            "1. Yes",
                            "2. No"
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when user selects option 3, 4, 5", function() {
            it("should respond with 'Please input the day'", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .inputs('3', '4')
                    .check.interaction({
                        state: 'state_op_day',
                        reply: "Please input the day you had your operation. "
                            + "For example, 12."
                    })
                    .run();
            });
        });

        describe("when user doesn't consent", function() {
            it("should respond with 'Without your consent'", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .inputs('3', '1', '2')
                    .check.interaction({
                        state: 'state_consent_no',
                        reply: [
                            "Without your consent, we cannot send you messages.",
                            "1. Main Menu",
                            "2. Back",
                            "3. Exit"
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when user selects 'Rate your clinic’s MMC service'", function() {
            it("should show the service ratings menu", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .inputs('4', '1')
                    .check.interaction({
                        state: 'state_servicerating_location',
                        reply: [
                            'At which clinic did you get circumcised? Please',
                            ' be specific with the name and location. e.g.',
                            ' Peterville Clinic, Rivonia, Johannesburg.'
                        ].join('')
                    })
                    .run();
            });
        });

        describe("when user responds 'I have not been circumcised' in service rating question 2", function() {
            it("should respond with 'looking for ratings by circumcised men'", function() {
                return tester
                    .setup.user.state('state_servicerating_location')
                    .inputs('User entered location', '3')
                    .check.interaction({
                        state: 'state_servicerating_end_negative',
                        reply: [
                            'Thank you for your interest. We are only looking' +
                            ' for ratings from men who have had' +
                            ' their circumcision at a clinic recently.',
                            '1. Main Menu',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when user responds 'Yes/No' in service rating question 2", function() {
            it("should finish the questionnaire and get a Thank you response", function() {
                return tester
                    .setup.user.state('state_servicerating_location')
                    .inputs('User entered location', '1', '5', '1')
                    .check.interaction({
                        state: 'state_servicerating_end_positive',
                        reply: [
                            'Thanks for rating your circumcision experience.' +
                            ' We appreciate your feedback, it will' +
                            ' help us improve our MMC service.',
                            '1. Main Menu',
                            '2. Exit'
                        ].join('\n')
                    })
                    .check(function(api, im, app) {
                        assert.deepEqual(im.user.answers, {
                            'state_servicerating_location':
                                'User entered location',
                            'state_servicerating_would_recommend':
                                'servicerating_yes_recommend',
                            'state_servicerating_rating':
                                'servicerating_excellent',
                            'state_servicerating_subscribed_to_post_op_sms':
                                'servicerating_subscribed_helpful'
                        });
                    })
                    .run();
            });
        });

        describe("when users chooses '2. Join Brothers for Life' in main menu page 2 and selects '1. Join'", function() {
            it("should notify user that they shall receive Brothers for Life updates", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .inputs('4', '2', '1')
                    .check.interaction({
                        state: 'state_bfl_join',
                        reply: [
                            'Thank you. You will now receive Brothers for' +
                            ' Life updates. You can opt out at any' +
                            ' point by replying STOP to an SMS you receive.',
                            '1. Main Menu',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when users chooses '2. Join Brothers for Life' in main menu page 2 and selects '2. No thanks'", function() {
            it("should inform the user how to join Brothers for Life later if they wish.", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .inputs('4', '2', '2')
                    .check.interaction({
                        state: 'state_bfl_no_join',
                        reply: [
                            'You have selected not to receive Brothers for' +
                            ' Life updates. You can join any time in' +
                            ' the future by dialling *120*662#.',
                            '1. Main Menu',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });
    });
});
