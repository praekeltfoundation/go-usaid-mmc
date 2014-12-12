var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var messagestore = require('./optoutstore');
var DummyOptoutResource = messagestore.DummyOptoutResource;


describe("app", function() {
    describe("GoApp", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoApp();

            tester = new AppTester(app);

            tester
                .setup.char_limit(561)
                .setup.config.app({
                    name: 'usaid_mmc',
                    env: 'test',
                    metric_store: 'usaid_mmc_test',
                    channel: "555",
                    control: {
                        username: "test_user",
                        api_key: "test_key",
                        url: "http://fixture/subscription/api/v1/"
                    }

                })
                .setup(function(api) {
                    fixtures().forEach(function(d) {
                        d.repeatable = true;
                        api.http.fixtures.add(d);
                    });
                })
                .setup(function(api) {
                    api.metrics.stores = {'usaid_mmc_test': {}};
                })

                // Set up contacts
                .setup(function(api) {
                    // unregistered user
                    api.contacts.add({
                        msisdn: '+082111',
                        extra: {},
                        key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                        user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                    });
                })
                .setup(function(api) {
                    // unregistered user
                    api.contacts.add({
                        msisdn: '+082222',
                        extra: {},
                        key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                        user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                    });
                })
                .setup(function(api) {
                    // registered user message stream complete
                    api.contacts.add({
                        msisdn: '+082333',
                        extra: {
                            is_registered: 'true'
                        },
                        key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                        user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                    });
                })
                .setup(function(api) {
                    // registered user message stream incomplete
                    api.contacts.add({
                        msisdn: '+082444',
                        extra: {
                            is_registered: 'true'
                        },
                        key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                        user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                    });
                })
                .setup(function(api) {
                    api.resources.add(new DummyOptoutResource());
                    api.resources.attach(api);
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
                        .check(function(api) {
                            var optouts = api.optout.optout_store;
                            assert.equal(optouts.length, 2);
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

        describe("when a user is opted-out", function() {
            describe("and sends START", function() {
                it("should opt them in", function() {
                    return tester
                        .setup.user.addr('27002')
                        .input('START')
                        .check.interaction({
                            state: 'states_optedin',
                            reply:
                                "You are now able to resubscribe. "+
                                "Please SMS 'MMC' to 555 to continue"
                        })
                        .check(function(api) {
                            var optouts = api.optout.optout_store;
                            assert.equal(optouts.length, 0);
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
                                "You're registered for messages about your circumcision! " +
                                "The wound will heal in 6 weeks. Do not have sex for 6 weeks to " +
                                "prevent infecting or damaging the wound. Avoid smoking, alcohol " +
                                "and drugs. Keep your penis upright for 7 - 10 days, until the " +
                                "swelling goes down. Wear clean underwear every day. Briefs, not " +
                                "boxers. Don't worry if some blood stains the bandage. If blood " +
                                "soaks the bandage, go to the clinic immediately. Brothers for Life. " +
                                "If you'd like messages in another language, reply with the " +
                                "number of your language",
                                "1. Xhosa",
                                "2. Zulu",
                                "3. Sotho",
                                "4. Afrikaans"
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
                describe("if they are responding to language choice", function() {

                    describe("if they only have one subscription", function() {
                        it("should update them to language", function() {
                            return tester
                                .setup.user.addr('082111')
                                .inputs('MMC', '1')
                                .check.interaction({
                                    state: 'states_update_language_success',
                                    reply:
                                        "The wound will heal in 6 weeks. Do not have sex for 6 weeks to " +
                                        "prevent infecting or damaging the wound. Avoid smoking, alcohol " +
                                        "and drugs.  Keep your penis upright for 7 - 10 days, until the " +
                                        "swelling goes down. Wear clean underwear every day. Briefs, not " +
                                        "boxers. Don't worry if some blood stains the bandage. If blood " +
                                        "soaks the bandage, go to the clinic immediately. Brothers for Life",
                                })
                                .check.user.properties({lang: 'xh'})
                                .run();
                        });
                    });

                    describe("if they have more than one subscription", function() {
                        it("should update all subscriptions to language", function() {
                            return tester
                                .setup.user.addr('082222')
                                .inputs('MMC', '2')
                                .check.interaction({
                                    state: 'states_update_language_success',
                                    reply:
                                        "The wound will heal in 6 weeks. Do not have sex for 6 weeks to " +
                                        "prevent infecting or damaging the wound. Avoid smoking, alcohol " +
                                        "and drugs.  Keep your penis upright for 7 - 10 days, until the " +
                                        "swelling goes down. Wear clean underwear every day. Briefs, not " +
                                        "boxers. Don't worry if some blood stains the bandage. If blood " +
                                        "soaks the bandage, go to the clinic immediately. Brothers for Life",
                                })
                                .check.user.properties({lang: 'zu'})
                                .run();
                        });
                    });

                });


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


        // METRICS
        describe("testing metrics", function() {

            describe("when a new user logs on", function() {
                it("should increase the number of unique users", function() {
                    return tester
                        .setup.user.addr('082555')
                        .inputs('log on')
                        .check(function(api) {
                            var metrics = api.metrics.stores.usaid_mmc_test;
                            assert.deepEqual(metrics['sum.unique_users'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when an unregistered user sends in MMC", function() {
                it("should increase the number of registered users", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs('mmc')
                        .check(function(api) {
                            var metrics = api.metrics.stores.usaid_mmc_test;
                            assert.deepEqual(metrics['sum.registrations'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when a user sends in STOP", function() {
                it("should increase the number of opted out users", function() {
                    return tester
                        .setup.user.addr('082333')
                        .inputs('stop')
                        .check(function(api) {
                            var metrics = api.metrics.stores.usaid_mmc_test;
                            assert.deepEqual(metrics['sum.optouts'].values, [1]);
                        })
                        .run();
                });
            });

        });

    });
});
