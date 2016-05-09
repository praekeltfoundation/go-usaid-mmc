var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var _ = require('lodash');

describe("app", function() {
    describe("GoApp", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoApp();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'test_app',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    channel: "*120*662*5#",
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                });
        });

        // TIMEOUT TESTING

        describe("when return user times-out first time", function() {
            it("should be welcomed back and given options", function() {
                return tester
                    .setup.user.lang('en')
                    .setup.user.state('state_main_menu')
                    .inputs(
                          '4'  // state_main_menu - 'more'
                        , '3'  // state_main_menu - 'change language'
                        , '2'  // state_select_language - 'iziZulu'
                        , {session_event: 'close'}  // timeout
                        , {session_event: 'new'}  // redial
                    )
                    .check.interaction({
                        state: 'state_timed_out',
                        reply: [
                            "Welcome back to the Medical Male Circumcision (MMC"
                            + ") service. What would you like to do?",
                            "1. Return to last screen visited",
                            "2. Main Menu",
                            "3. Exit",
                        ].join("\n"),
                    })
                    .check(function(api) {
                        var smses = _.where(api.outbound.store, {
                            endpoint: 'sms'
                        });
                        var sms = smses[0];
                        assert.equal(smses.length,1);
                        assert.equal(sms.content,
                            "Thanks for using the *120*662# MMC service! Dial "
                                + "back anytime to find MMC clinics, sign up "
                                + "for free SMSs about men's health or speak to"
                                + " a MMC expert (20c/20sec)"
                        );
                        assert.equal(sms.to_addr,'+27123456789');

                        assert.strictEqual(
                            app.contact.extra.language_choice, 'zu');
                    })
                    .run();
            });
        });

        describe("when return user times-out again", function() {
            it("should be welcomed back and given options", function() {
                return tester
                    .setup.user.lang('en')
                    .setup.user.state('state_main_menu')
                    .inputs(
                          '4'  // state_main_menu - 'more'
                        , '3'  // state_main_menu - 'change language'
                        , '2'  // state_select_language - 'iziZulu'
                        , {session_event: 'close'}  // timeout
                        , {session_event: 'new'}  // redial
                        , {session_event: 'close'}  // timeout
                        , {session_event: 'new'}  // redial
                    )
                    .check.interaction({
                        state: 'state_timed_out',
                        reply: [
                            "Welcome back to the Medical Male Circumcision (MMC"
                            + ") service. What would you like to do?",
                            "1. Return to last screen visited",
                            "2. Main Menu",
                            "3. Exit",
                        ].join("\n"),
                    })
                    .check(function(api) {
                        var smses = _.where(api.outbound.store, {
                            endpoint: 'sms'
                        });
                        var sms = smses[0];
                        assert.equal(smses.length,1);  // still only 1 sms sent
                        assert.equal(sms.to_addr,'+27123456789');

                        assert.strictEqual(
                            app.contact.extra.language_choice, 'zu');
                    })
                    .run();
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

        describe("when user selects 'Get FREE SMSs about your MMC recovery'", function() {
            it("should show the healthsites menu", function() {
                return tester
                    .setup.user.state('state_main_menu')
                    .input('3')
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
