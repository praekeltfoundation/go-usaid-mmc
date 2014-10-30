var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;


describe("app", function() {
    describe("GoApp", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoApp();

            tester = new AppTester(app);

            tester
                .setup.char_limit(160)
                .setup.config.app({
                    name: 'usaid_mmc',
                    env: 'test',
                    metric_store: 'usaid_mmc_test',
                    channel: "555"
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                })

                // Set up contacts
                .setup(function(api) {
                    // unregistered user
                    api.contacts.add({
                        msisdn: '+082111',
                        extra: {
                        }
                    });
                })
                .setup(function(api) {
                    // registered user message stream complete
                    api.contacts.add({
                        msisdn: '+082333',
                        extra: {
                            is_registered: 'true',
                            finished_messages: 'true'
                        }
                    });
                })
                .setup(function(api) {
                    // registered user message stream incomplete
                    api.contacts.add({
                        msisdn: '+082444',
                        extra: {
                            is_registered: 'true'
                        }
                    });
                });
        });

        describe("when a user wants to unsubscribe", function() {
            describe("when a registered user sends STOP", function() {
                it("should unsubscribe them", function() {
                    return tester
                        .setup.user.addr('082333')
                        .input('STOP')
                        .check.interaction({
                            state: 'states_unsubscribe',
                            reply:
                                "You have been unsubscribed."
                        })
                        .run();
                 });
            });

            describe("when an unregistered user sends BLOCK", function() {
                it("should unsubscribe them", function() {
                    return tester
                        .setup.user.addr('082111')
                        .input('BLOCK myself')
                        .check.interaction({
                            state: 'states_unsubscribe',
                            reply:
                                "You have been unsubscribed."
                        })
                        .run();
                 });
            });
        });

        describe("when a user sends in MMC", function() {
            describe("when the user is unregistered", function() {
                it("should register them, ask for their language choice", function() {
                    return tester
                        .setup.user.addr('082111')
                        .input('MMC')
                        .check.interaction({
                            state: 'states_language',
                            reply: [
                                "You're registered for messages about your circumcision! Reply " +
                                "with the number of your chosen language:",
                                "1. Xhosa",
                                "2. Zulu",
                                "3. Sotho",
                                "4. English",
                                "5. Afrikaans"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("when the user is registered", function() {
                describe("if they have received all messages", function() {
                    it("should tell them they've received all messages", function() {
                        return tester
                            .setup.user.addr('082333')
                            .input('MMC')
                            .check.interaction({
                                state: 'states_finished_messages',
                                reply:
                                    "You have finished your set of SMSs and your circumcision " +
                                    "wound should be healed. If not, please visit your local " +
                                    "clinic. Thanks for using the MMC info service.",
                            })
                            .run();
                    });
                });

                describe("if they have NOT received all messages", function() {
                    it("should tell them to wait and how to STOP", function() {
                        return tester
                            .setup.user.addr('082444')
                            .input('MMC')
                            .check.interaction({
                                state: 'states_unfinished_messages',
                                reply:
                                    "MMC info: U r registered to receive SMSs about ur " +
                                    "circumcision. To opt out SMS 'STOP' to 555. If u have " +
                                    "concerns with ur wound please visit ur local clinic.",
                            })
                            .run();
                    });
                });

            });
        });

        describe("when a user sends in anything except STOP, BLOCK, MMC", function() {
            describe("when the user is unregistered", function() {
                it("should tell them how to register", function() {
                    return tester
                        .setup.user.addr('082111')
                        .input('ouch')
                        .check.interaction({
                            state: 'states_how_to_register',
                            reply:
                                "Welcome to the Medical Male Circumcision (MMC) info service. " +
                                "To get FREE info on how to look after your circumcision " +
                                "wound please SMS 'MMC' to 555."
                        })
                        .run();
                });
            });

            describe("when the user is registered", function() {
                describe("if they have received all messages", function() {
                    it("should tell them they've received all messages", function() {
                        return tester
                            .setup.user.addr('082333')
                            .input('gah')
                            .check.interaction({
                                state: 'states_finished_messages',
                                reply:
                                    "You have finished your set of SMSs and your circumcision " +
                                    "wound should be healed. If not, please visit your local " +
                                    "clinic. Thanks for using the MMC info service.",
                            })
                            .run();
                    });
                });

                describe("if they have NOT received all messages", function() {
                    it("should tell them to wait and how to STOP", function() {
                        return tester
                            .setup.user.addr('082444')
                            .input('why')
                            .check.interaction({
                                state: 'states_unfinished_messages',
                                reply:
                                    "MMC info: U r registered to receive SMSs about ur " +
                                    "circumcision. To opt out SMS 'STOP' to 555. If u have " +
                                    "concerns with ur wound please visit ur local clinic.",
                            })
                            .run();
                    });
                });
            });
        });


    });
});
