var vumigo = require("vumigo_v02");
var fixtures = require("./fixtures");
var _ = require('lodash');
var AppTester = vumigo.AppTester;
var assert = require("assert");
var location = require('go-jsbox-location');
var openstreetmap = location.providers.openstreetmap;


describe("MMC App", function() {
    describe("USSD", function() {
        var app;
        var tester;
        var locations;

        beforeEach(function() {
            app = new go.app.GoApp();
            tester = new AppTester(app);
            locations = [];

            locations.push({
                query: "Quad Street",
                key: "osm_api_key",
                bounding_box: ["16.4500", "-22.1278", "32.8917", "-34.8333"],
                address_limit: 4,
                response_data: [{
                    display_name: "Quad St 1, Sub 1",
                    lon: '1.1',
                    lat: '1.11',
                    address: {
                        road: "Quad St 1",
                        suburb: "Suburb number 1",
                        city: "City number 1",
                        town: "Town 1",
                        postcode: "0001",
                        country: "RSA",
                        country_code: "za"
                    }
                }, {
                    display_name: "Quad St 2, Sub 2",
                    lon: '2.2',
                    lat: '2.22',
                    address: {
                        road: "Quad St 2",
                        suburb: "Suburb number 2",
                        town: "Town number 2",
                        postcode: "0002",
                        country: "RSA",
                        country_code: "za"
                    }
                }, {
                    display_name: "Quad St 3, Sub 3",
                    lon: '3.3',
                    lat: '3.33',
                    address: {
                        road: "Quad St 3",
                        suburb: "Suburb number 3",
                        city: "City number 3",
                        postcode: "0003",
                        country: "RSA",
                        country_code: "za"
                    }
                }, {
                    display_name: "Quad St 4, Sub 4",
                    lon: '4.4',
                    lat: '4.44',
                    address: {
                        road: "Quad St 4",
                        suburb: "Suburb number 4",
                        postcode: "0004",
                        country: "RSA",
                        country_code: "za"
                    }
                }]
            });

            locations.push({
                query: "Friend Street",
                key: "osm_api_key",
                bounding_box: ["16.4500", "-22.1278", "32.8917", "-34.8333"],
                address_limit: 4,
                response_data: [{
                    display_name: "Friend Street, Suburb",
                    lon: '3.1415',
                    lat: '2.7182'
                }]
            });

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: "test_app",
                    testing_today: "2015-05-03 06:07:08.999",
                    control: {
                        username: "test_user",
                        api_key: "test_key",
                        url: "http://fixture/subscription/api/v1/"
                    },
                    metric_store: 'ussd_app_test',
                    endpoints: {
                        "sms": {
                            "delivery_class": "sms"
                        }
                    },
                    messageset_id: 12,
                    sms_number: '555',
                    lbs_providers: ['VODACOM', 'MTN'],
                    api_url: 'http://127.0.0.1:8000/clinicfinder/',
                    api_key: 'replace_with_token',
                    template: "Your nearest clinics are: {{ results }}. " +
                        "Thanks for using Healthsites.",
                    osm: {
                        api_key: "osm_api_key",
                    },
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
                    fixtures().forEach(api.http.fixtures.add);
                    api.groups.add({
                        key: "bfl_key",
                        name: "bfl",
                    });
                    locations.forEach(function(location) {
                        api.http.fixtures.add(openstreetmap.fixture(location));
                    });
                })
                .setup(function(api) {
                    api.metrics.stores = {
                        'ussd_app_test': {}
                    };
                });
        });

        describe("Timeout testing", function() {
            describe("When a user times out", function() {
                it("should send one dialback sms", function() {
                    return tester
                        .inputs({
                                session_event: 'new'
                            } // dial in first time
                            , "3" // state_select_language - sesotho
                            , {
                                session_event: 'close'
                            } // may or may not work
                            , {
                                session_event: 'new'
                            } // redial
                            , {
                                session_event: 'close'
                            } // may or may not work
                        )
                        .check(function(api) {
                            var smses = _.where(api.outbound.store, {
                                endpoint: 'sms'
                            });
                            assert.equal(smses.length, 1);
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.ussd_app_test;
                            assert.equal(Object.keys(metrics).length, 9);
                            assert.deepEqual(metrics['ussd.timeout_sms.sent'].values, [1]);
                            assert.deepEqual(metrics['ussd.views.state_select_language'].values, [1]);
                            assert.deepEqual(metrics['ussd.views.state_timed_out'].values, [1]);
                            assert.deepEqual(metrics['ussd.views.state_main_menu'].values, [1]);
                        })
                        .run();
                });
            });
            describe("When a timed out user dials back in", function() {
                it("should show timed_out state", function() {
                    return tester
                        .inputs({
                                session_event: 'new'
                            } // dial in first time
                            , "3" // state_select_language - sesotho
                            , {
                                session_event: 'close'
                            } // may or may not work
                            , {
                                session_event: 'new'
                            } // redial
                        )
                        .check.interaction({
                            state: "state_timed_out"
                        })
                        .run();
                });
                it("should go to last state", function() {

                });
                it("should go to main menu", function() {

                });
                it("should go to end state", function() {

                });
            });
        });

        describe("Flow testing - ", function() {
            describe("(Start screen) state: state_start", function() {
                it("to state_start", function() {
                    return tester
                        .start()
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                "Welcome to Healthsites. What type of service are" +
                                " you looking for?",
                                "1. Medical Male Circumcision (MMC)",
                                "2. HIV Services",
                                "3. Gender Based Violence (GBV)"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_mmc_menu via state_start", function() {
                    return tester
                        .setup.user.state("state_start")
                        .inputs("1")
                        .check.interaction({
                            state: "state_mmc_menu",
                            reply: [
                                "Medical Male Circumcision (MMC):",
                                "1. Find a clinic",
                                // "1. Speak to an expert for FREE",
                                "2. Get FREE SMSs about your MMC recovery",
                                "3. Rate your clinic's MMC service",
                                "4. Join Brothers for Life",
                                "5. More",
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_healthsite_hct_types via state_start", function() {
                    return tester
                        .setup.user.state("state_start")
                        .inputs("2")
                        .check.interaction({
                            state: "state_healthsite_hct_types",
                            reply: [
                                "What type of HIV service are you looking for?",
                                "1. Testing",
                                "2. Treatment",
                                "3. Support"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_healthsite_gbv_types via state_start", function() {
                    return tester
                        .setup.user.state("state_start")
                        .inputs("3")
                        .check.interaction({
                            state: "state_healthsite_gbv_types",
                            reply: [
                                "What type of Gender Based Violence organisation are you looking for?",
                                "1. Thuthuzela Centres",
                                "2. Support Organisations"
                            ].join("\n")
                        })
                        .run();
                });


                // // test HIV Services sub-menu
                // describe("when the user selects the 'HIV Services' clinic type", function() {
                //     it("to state_healthsite_hct_types (HIV Services sub-menu)", function() {
                //         return tester
                //             .setup.user.state('state_healthsites')
                //             .input({
                //                 content: '2'
                //             })
                //             .check.interaction({
                //                 state: 'state_healthsite_hct_types',
                //                 reply: [
                //                     "What type of HIV service are you looking for?",
                //                     "1. Testing",
                //                     "2. Treatment",
                //                     "3. Support"
                //                 ].join("\n")
                //             })
                //             .run();
                //     });
                //
                //     describe("and selects a sub-type", function() {
                //         it("should include the clinic type AND sub-type in the search " +
                //         "request", function() {
                //             return tester
                //                 .setup.user.addr('082111')
                //                 .setup.user.state('state_healthsites')
                //                 .inputs(
                //                     { content: '2',
                //                       provider: 'CellC' },  // state_healthsites
                //                     '1',  // state_healthsite_hct_types
                //                     'Friend Street'  // state_suburb
                //                 )
                //                 .check(function (api) {
                //                     var search_request = api.http.requests[1];
                //                     assert.deepEqual(search_request.data.search, {
                //                         "source": "internal",
                //                         "hct": "true",
                //                         "hct_testing": "true"
                //                     });
                //                 })
                //                 .run();
                //         });
                //     });
                // });


                // describe("(Language Choice & Main Menu)", function() {
                //     it("to state_select_language if number not registered", function() {
                //         return tester
                //             .start()
                //             .check.interaction({
                //                 state: "state_select_language",
                //                 reply: [
                //                     "Welcome to Healthsites. Choose your language:",
                //                     "1. English",
                //                     "2. isiZulu",
                //                     "3. Afrikaans",
                //                     "4. Sesotho",
                //                     "5. Siswati",
                //                     "6. isiNdebele",
                //                     "7. Setswana",
                //                     "8. isiXhosa",
                //                     "9. Xitsonga"
                //                 ].join("\n")
                //             })
                //             .check(function() {
                //                 assert.strictEqual(
                //                     app.contact.extra.language_choice, undefined);
                //             })
                //             .check(function(api) {
                //                 var metrics = api.metrics.stores.ussd_app_test;
                //                 assert.equal(Object.keys(metrics).length, 5);
                //                 assert.deepEqual(metrics['ussd.unique_users'].values, [1]);
                //                 assert.deepEqual(metrics['ussd.unique_users.transient'].values, [1]);
                //                 assert.deepEqual(metrics['ussd.sessions'].values, [1]);
                //                 assert.deepEqual(metrics['ussd.sessions.transient'].values, [1]);
                //             })
                //             .run();
                //     });
                //     it("to state_main_menu after language is selected", function() {
                //         return tester
                //             .setup.user.state("state_select_language")
                //             .input("2")  // zulu
                //             .check.interaction({
                //                 state: "state_main_menu",
                //                 reply: [
                //                     "Medical Male Circumcision (MMC):",
                //                     "1. Find a clinic",
                //                     "2. Get FREE SMSs about your MMC recovery",
                //                     "3. Rate your clinic\'s MMC service",
                //                     "4. Join Brothers for Life",
                //                     "5. More"
                //                 ].join('\n')
                //             })
                //             .check.user.properties({lang: 'zu'})
                //             .check(function() {
                //                 assert.strictEqual(
                //                     app.contact.extra.language_choice, "zu");
                //             })
                //             .check(function(api) {
                //                 var metrics = api.metrics.stores.ussd_app_test;
                //                 assert.equal(Object.keys(metrics).length, 2);
                //                 assert.deepEqual(metrics['ussd.lang.zu'].values, [1]);
                //             })
                //             .run();
                //     });
                //     it("to state_language_set if language preference changed", function() {
                //         return tester
                //             .setup.user.lang('en')
                //             .setup.user.state("state_main_menu")
                //             .inputs(
                //                 "5"  // state_main_menu - More
                //                 , "1"  // state_main_menu - Change Language
                //                 , "2"  // state_select_language - Zulu
                //             )
                //             .check.interaction({
                //                 state: "state_language_set",
                //                 reply: [
                //                     "Your new language choice has been saved.",
                //                     "1. Main Menu",
                //                     "2. Exit",
                //                 ].join("\n")
                //             })
                //             .check(function() {
                //                 assert.strictEqual(
                //                     app.contact.extra.language_choice, "zu");
                //             })
                //             .run();
                //     });
                // });

                // describe("when the user selects a clinic type", function() {
                //     it("should incr the clinic_type metric", function() {
                //         return tester
                //             .setup.user.addr('082111')
                //             .setup.user.state('state_healthsites')
                //             .input(
                //                 { content: '1',
                //                   provider: 'MTN' }  // state_healthsites
                //             )
                //             .check(function(api) {
                //                 var metrics = api.metrics.stores.ussd_app_test;
                //                 assert.deepEqual(metrics['sum.clinic_type_select.mmc'].values, [1]);
                //             })
                //             .run();
                //     });
                // });
                //
                // // test HIV Services sub-menu
                // describe("when the user selects the 'HIV Services' clinic type", function() {
                //     it("to state_healthsite_hct_types (HIV Services sub-menu)", function() {
                //         return tester
                //             .setup.user.state('state_healthsites')
                //             .input({
                //                 content: '2'
                //             })
                //             .check.interaction({
                //                 state: 'state_healthsite_hct_types',
                //                 reply: [
                //                     "What type of HIV service are you looking for?",
                //                     "1. Testing",
                //                     "2. Treatment",
                //                     "3. Support"
                //                 ].join("\n")
                //             })
                //             .run();
                //     });
                //
                //     describe("and selects a sub-type", function() {
                //         it("should include the clinic type AND sub-type in the search " +
                //         "request", function() {
                //             return tester
                //                 .setup.user.addr('082111')
                //                 .setup.user.state('state_healthsites')
                //                 .inputs(
                //                     { content: '2',
                //                       provider: 'CellC' },  // state_healthsites
                //                     '1',  // state_healthsite_hct_types
                //                     'Friend Street'  // state_suburb
                //                 )
                //                 .check(function (api) {
                //                     var search_request = api.http.requests[1];
                //                     assert.deepEqual(search_request.data.search, {
                //                         "source": "internal",
                //                         "hct": "true",
                //                         "hct_testing": "true"
                //                     });
                //                 })
                //                 .run();
                //         });
                //     });
                // });
                //
                // // test Gender Based Violence sub-menu
                // describe("when the user selects the 'Gender Based Violence' " +
                // "clinic type", function() {
                //     it("to state_healthsite_gbv_types " +
                //     "(Gender Based Violence sub-menu)", function() {
                //         return tester
                //             .setup.user.state('state_healthsites')
                //             .input({
                //                 content: '3'
                //             })
                //             .check.interaction({
                //                 state: 'state_healthsite_gbv_types',
                //                 reply: [
                //                     "What type of Gender Based Violence organisation are you " +
                //                     "looking for?",
                //                     "1. Thuthuzela Centres",
                //                     "2. Support Organisations"
                //                 ].join("\n")
                //             })
                //             .run();
                //     });
                //
                //     describe("and selects a sub-type", function() {
                //         it("should include the clinic type AND sub-type in the search " +
                //         "request", function() {
                //             return tester
                //                 .setup.user.addr('082111')
                //                 .setup.user.state('state_healthsites')
                //                 .inputs(
                //                     { content: '3',
                //                       provider: 'CellC' },  // state_healthsites
                //                     '1',  // state_healthsite_gbv_types
                //                     'Friend Street'  // state_suburb
                //                 )
                //                 .check(function (api) {
                //                     var search_request = api.http.requests[1];
                //                     assert.deepEqual(search_request.data.search, {
                //                         "source": "internal",
                //                         "gbv": "true",
                //                         "gbv_thuthuzela": "true"
                //                     });
                //                 })
                //                 .run();
                //         });
                //     });
                // });
                //
                // describe("if the user uses a provider that provides location " +
                // "based search", function() {
                //     it("should confirm locating them", function() {
                //         return tester
                //             .setup.user.addr('082111')
                //             .setup.user.state('state_healthsites')
                //             .input(
                //                 { content: '1',
                //                   provider: 'MTN' }  // state_healthsites
                //             )
                //             .check.interaction({
                //                 state: 'state_locate_permission',
                //                 reply: [
                //                     "Thanks! We will now locate your approximate " +
                //                     "position and then send you an SMS with your " +
                //                     "nearest clinic.",
                //                     "1. Continue",
                //                     "2. No don't locate me"
                //                 ].join('\n')
                //             })
                //             .run();
                //     });
                //
                //     describe("if the user chooses 1. Continue", function() {
                //         it("should increase the sum.database_queries metric", function() {
                //             return tester
                //                 .setup.user.addr('082111')
                //                 .setup.user.state('state_healthsites')
                //                 .inputs(
                //                     { content: '1',
                //                         provider: 'MTN' },  // state_healthsites
                //                     '1'  // state_locate_permission
                //                 )
                //                 .check(function(api) {
                //                     var metrics = api.metrics.stores.ussd_app_test;
                //                     assert.deepEqual(metrics['sum.database_queries.mmc'].values, [1]);
                //                 })
                //                 .run();
                //         });
                //         it("should ask about health services opt-in", function() {
                //             return tester
                //                 .setup.user.addr('082111')
                //                 .setup.user.state('state_healthsites')
                //                 .inputs(
                //                     { content: '1',
                //                         provider: 'MTN' },  // state_healthsites
                //                     '1'  // state_locate_permission
                //                 )
                //                 .check.interaction({
                //                     state: 'state_health_services',
                //                     reply: [
                //                         "U will get an SMS with clinic info. " +
                //                         "Want 2 get more health info? T&Cs " +
                //                         "www.brothersforlife.mobi " +
                //                         "or www.zazi.org.za",
                //                         "1. Yes - I'm a Man",
                //                         "2. Yes - I'm a Woman",
                //                         "3. No"
                //                     ].join("\n")
                //                 })
                //                 .run();
                //         });
                //
                //         describe("if a custom clinic source is configured", function () {
                //             it("should specify the clinic source in the search request",
                //             function() {
                //                 return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .setup.config.app({clinic_data_source: "aat"})
                //                     .inputs(
                //                         { content: '1',
                //                           provider: 'MTN' },  // state_healthsites
                //                         '1'  // state_locate_permission
                //                     )
                //                     .check.interaction({
                //                         state: 'state_health_services',
                //                         reply: [
                //                             "U will get an SMS with clinic info. " +
                //                             "Want 2 get more health info? T&Cs " +
                //                             "www.brothersforlife.mobi " +
                //                             "or www.zazi.org.za",
                //                             "1. Yes - I'm a Man",
                //                             "2. Yes - I'm a Woman",
                //                             "3. No"
                //                         ].join("\n")
                //                     })
                //                     .check(function (api) {
                //                         var search_request = api.http.requests[0];
                //                         assert.deepEqual(
                //                             search_request.data
                //                                 .pointofinterest.search, {
                //                                     "source": "aat",
                //                                     "mmc": "true",
                //                                 });
                //                     })
                //                     .run();
                //             });
                //         });
                //     });
                //
                //     describe("if the user chooses 2. No don't locate", function() {
                //         it("should reprompt for location consent", function() {
                //             return tester
                //                 .setup.user.addr('082111')
                //                 .setup.user.state('state_healthsites')
                //                 .inputs(
                //                     { content: '1',
                //                       provider: 'MTN' },  // state_healthsites
                //                     '2'  // state_locate_permission
                //                 )
                //                 .check.interaction({
                //                     state: 'state_reprompt_permission',
                //                     reply: [
                //                         "If you do not give consent we can't locate you automatically. " +
                //                         "Alternatively, tell us where you live, " +
                //                         "(area or suburb)",
                //                         "1. Give consent",
                //                         "2. Enter location",
                //                         "3. Quit"
                //                     ].join('\n')
                //                 })
                //                 .run();
                //         });
                //
                //         describe("if the user replies after initially refusing consent", function() {
                //             describe("if they choose 1. Give consent", function() {
                //                 it("should ask about health services opt-in", function() {
                //                     return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .inputs(
                //                         { content: '1',
                //                           provider: 'MTN' },  // state_healthsites
                //                         '2',  // state_locate_permission
                //                         '1'  // state_reprompt_permission
                //                     )
                //                     .check.interaction({
                //                         state: 'state_health_services',
                //                         reply: [
                //                             "U will get an SMS with clinic info. " +
                //                             "Want 2 get more health info? T&Cs " +
                //                             "www.brothersforlife.mobi " +
                //                             "or www.zazi.org.za",
                //                             "1. Yes - I'm a Man",
                //                             "2. Yes - I'm a Woman",
                //                             "3. No"
                //                         ].join("\n")
                //                     })
                //                     .run();
                //                 });
                //             });

                //             describe("if they choose 2. Give suburb", function() {
                //                 it("should prompt for their suburb", function() {
                //                     return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .inputs(
                //                         { content: '1',
                //                           provider: 'MTN' },  // state_healthsites
                //                         '2',  // state_locate_permission
                //                         '2'  // state_reprompt_permission
                //                     )
                //                     .check.interaction({
                //                         state: 'state_suburb',
                //                         reply:
                //                             "To find your closest clinic we need to know where you live, " +
                //                             "the suburb or area u are in. Please be " +
                //                             "specific. e.g. Inanda Sandton"
                //                     })
                //                     .run();
                //                 });
                //             });
                //
                //             describe("if they choose 2. and give suburb", function() {
                //                 it("should ask about health services opt-in", function() {
                //                     return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .inputs(
                //                         {content: '1', provider: 'MTN' }, // state_healthsites
                //                         {content: '2', provider: 'MTN' },  // state_locate_permission
                //                         {content: '2', provider: 'MTN' },  // state_reprompt_permission
                //                         {content: 'Friend Street', provider: 'MTN' }  // state_suburb
                //                     )
                //                     .check.interaction({
                //                         state: 'state_health_services',
                //                         reply: [
                //                             "U will get an SMS with clinic info. " +
                //                             "Want 2 get more health info? T&Cs " +
                //                             "www.brothersforlife.mobi " +
                //                             "or www.zazi.org.za",
                //                             "1. Yes - I'm a Man",
                //                             "2. Yes - I'm a Woman",
                //                             "3. No"
                //                         ].join("\n")
                //                     })
                //                     .run();
                //                 });
                //             });
                //         });
                //     });
                //
                //     describe("if they choose 3. Quit", function() {
                //         it("should show info and quit", function() {
                //             return tester
                //                 .setup.user.addr('082111')
                //                 .setup.user.state('state_healthsites')
                //                 .inputs(
                //                     { content: '1',
                //                       provider: 'MTN' },  // state_healthsites
                //                     '2',  // state_locate_permission
                //                     '3'  // state_reprompt_permission
                //                 )
                //                 .check.interaction({
                //                     state: 'state_end',
                //                     reply:
                //                         "Thanks for using the *120*662# MMC" +
                //                         " service! Dial back anytime to " +
                //                         "find MMC clinics, sign up for " +
                //                         "healing SMSs or find more info " +
                //                         "about MMC (20c/20sec) Yenzakahle!"
                //                 })
                //                 .check.reply.ends_session()
                //                 .run();
                //
                //         });
                //     });
                // });
                //
                // describe("if the user on transport that does not have provider for " +
                // "location based search", function() {
                //     it("should ask for their suburb", function() {
                //         return tester
                //             .setup.user.addr('082111')
                //             .setup.user.state('state_healthsites')
                //             .input(
                //                 { content: '1' }  // state_healthsites
                //             )
                //             .check.interaction({
                //                 state: 'state_suburb',
                //                 reply:
                //                     "To find your closest clinic we need to know where you live, " +
                //                     "the suburb or area u are in. Please be " +
                //                     "specific. e.g. Inanda Sandton"
                //             })
                //             .run();
                //     });
                // });
                //
                // describe("if the user does not use a provider that provides " +
                // "location based search", function() {
                //     it("should ask for their suburb", function() {
                //         return tester
                //             .setup.user.addr('082111')
                //             .setup.user.state('state_healthsites')
                //             .input(
                //                 { content: '1',
                //                   provider: 'CellC' }  // state_healthsites
                //             )
                //             .check.interaction({
                //                 state: 'state_suburb',
                //                 reply:
                //                     "To find your closest clinic we need to know where you live, " +
                //                     "the suburb or area u are in. Please be " +
                //                     "specific. e.g. Inanda Sandton"
                //             })
                //             .run();
                //     });
                //
                //     describe("after entering their suburb", function() {
                //         describe("if there is only one location option", function() {
                //             it("should ask about health services opt-in", function() {
                //                 return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .inputs(
                //                         { content: '1',
                //                           provider: 'CellC' },  // state_healthsites
                //                         'Friend Street'  // state_suburb
                //                     )
                //                     .check.interaction({
                //                         state: 'state_health_services',
                //                         reply: [
                //                             "U will get an SMS with clinic info. " +
                //                             "Want 2 get more health info? T&Cs " +
                //                             "www.brothersforlife.mobi " +
                //                             "or www.zazi.org.za",
                //                             "1. Yes - I'm a Man",
                //                             "2. Yes - I'm a Woman",
                //                             "3. No"
                //                         ].join("\n")
                //                     })
                //                     .run();
                //             });
                //
                //             it("should save location data to contact", function() {
                //                 return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .inputs(
                //                         { content: '1',
                //                           provider: 'CellC' },  // state_healthsites
                //                         'Friend Street'  // state_suburb
                //                     )
                //                     .check(function(api) {
                //                         var contact = _.find(api.contacts.store, {
                //                                             msisdn: '+082111'
                //                                         });
                //                         assert.equal(contact.extra[
                //                             'location:formatted_address'],
                //                             'Friend Street, Suburb');
                //                         assert.equal(contact.extra[
                //                             'location:lon'], '3.1415');
                //                         assert.equal(contact.extra[
                //                             'location:lat'], '2.7182');
                //                     })
                //                     .run();
                //             });
                //
                //             describe("if a custom clinic source is configured", function () {
                //                 it("should specify the clinic source in the search request",
                //                 function() {
                //                     return tester
                //                         .setup.user.addr('082111')
                //                         .setup.user.state('state_healthsites')
                //                         .setup.config.app({clinic_data_source: "aat"})
                //                         .inputs(
                //                             { content: '1',
                //                               provider: 'CellC' },  // state_healthsites
                //                             'Friend Street'  // state_suburb
                //                         )
                //                         .check.interaction({
                //                             state: 'state_health_services',
                //                             reply: [
                //                                 "U will get an SMS with clinic info. " +
                //                                 "Want 2 get more health info? T&Cs " +
                //                                 "www.brothersforlife.mobi " +
                //                                 "or www.zazi.org.za",
                //                                 "1. Yes - I'm a Man",
                //                                 "2. Yes - I'm a Woman",
                //                                 "3. No"
                //                             ].join("\n")
                //                         })
                //                         .check(function (api) {
                //                             var search_request = api.http.requests[1];
                //                             assert.deepEqual(search_request.data.search, {
                //                                 "source": "aat",
                //                                 "mmc": "true",
                //                             });
                //                         })
                //                         .run();
                //                 });
                //             });
                //         });
                //
                //         describe("if there are multiple location options", function() {
                //             it("should display a list of address options", function() {
                //                 return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .inputs(
                //                         { content: '1',
                //                           provider: 'CellC' },  // state_healthsites
                //                         'Quad Street'  // state_suburb
                //                     )
                //                     .check.interaction({
                //                         state: 'state_suburb',
                //                         reply: [
                //                             "Please select your location:",
                //                             "1. Suburb number 1, City number 1",
                //                             "2. Suburb number 2, Town number 2",
                //                             "3. Suburb number 3, City number 3",
                //                             "n. More",
                //                             "p. Back"
                //                         ].join('\n')
                //                     })
                //                     .run();
                //             });
                //
                //             it("should go the next page if 'n' is chosen", function() {
                //                 return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .inputs(
                //                         { content: '1',
                //                           provider: 'CellC' },  // state_healthsites
                //                         'Quad Street',  // state_suburb
                //                         'n'  // state_suburb
                //                     )
                //                     .check.interaction({
                //                         state: 'state_suburb',
                //                         reply: [
                //                             "Please select your location:",
                //                             "1. Suburb number 4",
                //                             "n. More",
                //                             "p. Back"
                //                         ].join('\n')
                //                     })
                //                     .run();
                //             });
                //
                //             it("should go to the previous page if 'p' is chosen", function() {
                //                 return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .inputs(
                //                         { content: '1',
                //                           provider: 'CellC' },  // state_healthsites
                //                         'Quad Street',  // state_suburb
                //                         'n',  // state_suburb
                //                         'p'  // state_suburb
                //                     )
                //                     .check.interaction({
                //                         state: 'state_suburb',
                //                         reply: [
                //                             "Please select your location:",
                //                             "1. Suburb number 1, City number 1",
                //                             "2. Suburb number 2, Town number 2",
                //                             "3. Suburb number 3, City number 3",
                //                             "n. More",
                //                             "p. Back"
                //                         ].join('\n')
                //                     })
                //                     .run();
                //             });
                //
                //             it("should save data to contact upon choice", function() {
                //                 return tester
                //                     .setup.user.addr('082111')
                //                     .setup.user.state('state_healthsites')
                //                     .inputs(
                //                         { content: '1',
                //                           provider: 'CellC' },  // state_healthsites
                //                         'Quad Street',  // state_suburb
                //                         '3'  // state_suburb
                //                     )
                //                     .check(function(api) {
                //                         var contact = _.find(api.contacts.store, {
                //                                             msisdn: '+082111'
                //                                         });
                //                         assert.equal(contact.extra[
                //                             'location:formatted_address'],
                //                             'Suburb number 3, City number 3');
                //                         assert.equal(contact.extra[
                //                             'location:lon'], '3.3');
                //                         assert.equal(contact.extra[
                //                             'location:lat'], '3.33');
                //                     })
                //                     .run();
                //             });
                //         });
                //     });
                // });

                // describe("when the user responds to health service option", function() {
                //     it("should store option as extra, thank them and exit", function() {
                //         return tester
                //             .setup.user.addr('082111')
                //             .setup.user.state('state_healthsites')
                //             // .setup.user.lang('en');
                //             .inputs(
                //                 { content: '1',
                //                 provider: 'CellC' },  // state_healthsites
                //                 'Friend Street',  // state_suburb
                //                 '1'  // state_health_services
                //             )
                //             .check.interaction({
                //                 state: 'state_thanks',
                //                 reply:
                //                 "Thanks for using the Healthsites " +
                //                 "Service. Opt out at any stage by " +
                //                 "SMSing 'STOP' in reply to your " +
                //                 "clinic info message."
                //             })
                //             .check(function(api) {
                //                 var contact = _.find(api.contacts.store, {
                //                                 msisdn: '+082111'
                //                             });
                //                 assert.equal(contact.extra.health_services, 'male');
                //             })
                //             .check.reply.ends_session()
                //             .run();
                //     });
                // });
                //
                // describe("if the user finds two clinics", function() {
                //     it("should increase the sum.multiple_times_users metric", function() {
                //         return tester
                //             .setup.user.addr('082111')
                //             .setup.user.state('state_healthsites')
                //             .setup.user.lang('en')
                //             .inputs(
                //                 { content: '1',
                //                 provider: 'MTN' },  // state_healthsites
                //                 '1',  // state_locate_permission
                //                 '2',  // state_health_services
                //                 {session_event: "new"},
                //                 '1',  // state_main_menu
                //                 { content: '1',
                //                 provider: 'CellC' },  // state_healthsites
                //                 'Friend Street'  // state_suburb
                //             )
                //             .check(function(api) {
                //                 var metrics = api.metrics.stores.ussd_app_test;
                //                 assert.deepEqual(metrics['sum.multiple_time_users'].values, [1]);
                //             })
                //             .run();
                //     });
                //
                //     it("should track the service provider metric", function() {
                //         return tester
                //         .setup.user.addr('082111')
                //         .setup.user.state('state_healthsites')
                //         .setup.user.lang('en')
                //         .inputs(
                //             { content: '1',
                //             provider: 'MTN' },  // state_healthsites
                //             '1',  // state_locate_permission
                //             '2',  // state_health_services
                //             {session_event: "new"},
                //             '1',  // state_main_menu
                //             { content: '1',
                //             provider: 'CellC' },  // state_healthsites
                //             'Friend Street'  // state_suburb
                //         )
                //         .check(function(api) {
                //             var metrics = api.metrics.stores.ussd_app_test;
                //             assert.deepEqual(metrics['sum.service_provider.mtn'].values, [1]);
                //             assert.deepEqual(metrics['sum.service_provider.other'].values, [1]);
                //         })
                //         .run();
                //     });
                //
                //     it("should track the locate type metric", function() {
                //         return tester
                //             .setup.user.addr('082111')
                //             .setup.user.state('state_healthsites')
                //             .setup.user.lang('en')
                //             .inputs(
                //                 { content: '1',
                //                   provider: 'MTN' },  // state_healthsites
                //                 '1',  // state_locate_permission
                //                 '2',  // state_health_services
                //                 {session_event: "new"},
                //                 '1',  // state_main_menu
                //                 { content: '1',
                //                   provider: 'CellC' },  // state_healthsites
                //                 'Friend Street'  // state_suburb
                //             )
                //             .check(function(api) {
                //                 var metrics = api.metrics.stores.ussd_app_test;
                //                 assert.deepEqual(metrics['sum.locate_type.suburb'].values, [1]);
                //                 assert.deepEqual(metrics['sum.locate_type.lbs'].values, [1]);
                //             })
                //             .run();
                //     });
                // });

                describe("if the user finds three clinics", function() {
                    it("should increase the sum.multiple_times_users metric",
                        function() {
                            return tester
                                .setup.user.addr('082111')
                                .setup.user.state('state_healthsites')
                                .setup.user.lang('en')
                                .inputs({
                                        content: '1',
                                        provider: 'MTN'
                                    }, // state_healthsites
                                    '1', // state_locate_permission
                                    '2', // state_health_services
                                    {
                                        session_event: "new"
                                    },
                                    '1', // state_main_menu
                                    {
                                        content: '1',
                                        provider: 'CellC'
                                    }, // state_healthsites
                                    'Friend Street', // state_suburb
                                    '2', // state_health_services
                                    {
                                        session_event: "new"
                                    },
                                    '1', // state_main_menu
                                    {
                                        content: '1',
                                        provider: 'CellC'
                                    }, // state_healthsites
                                    'Quad Street', // state_suburb
                                    '3' // state_suburb
                                )
                                .check(function(api) {
                                    var metrics = api.metrics.stores.ussd_app_test;
                                    assert.deepEqual(metrics['sum.multiple_time_users'].values, [1]);
                                })
                                .run();
                        });
                });

            });

            // describe("(Speak to Expert)", function() {
            //     // disabled
            // });

            // describe("(Post OP SMS Registration)", function() {
            //     it("to state_op", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .input("2")
            //             .check.interaction({
            //                 state: "state_op",
            //                 reply: [
            //                     "We need to know when you had your MMC to send you " +
            //                     "the correct SMSs. Please select:",
            //                     "1. Today",
            //                     "2. Yesterday",
            //                     "3. May '15",
            //                     "4. April '15",
            //                     "5. March '15",
            //                     "6. I haven't had my operation yet"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_pre_op", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "6")
            //             .check.interaction({
            //                 state: "state_pre_op",
            //                 reply: [
            //                     "Thank you for your interest in MMC. Unfortunately, you can" +
            //                     " only register once you have had your operation.",
            //                     "1. Main Menu",
            //                     "2. Exit"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_consent (menu options 1 & 2)", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "1")
            //             .check.interaction({
            //                 state: "state_consent",
            //                 reply: [
            //                     "Do you consent to:\n" +
            //                     "- Receiving some SMSs on public holidays, " +
            //                     "weekends & before 8am?\n" +
            //                     "- Having ur cell# & language info stored so we " +
            //                     "can send u SMSs?",
            //                     "1. Yes",
            //                     "2. No"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_op_day (menu option 3,4,5)", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "4")
            //             .check.interaction({
            //                 state: "state_op_day",
            //                 reply: "Please input the day you had your operation. " +
            //                     "For example, 12."
            //             })
            //             .run();
            //     });
            //     it("to state_6week_notice; op date >= 6 weeks ago", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "5", "13")
            //             .check.interaction({
            //                 state: "state_6week_notice",
            //                 reply: [
            //                     "We only send SMSs up to 6 wks after MMC. Visit " +
            //                     "the clinic if you aren't healed. If you'd like " +
            //                     "to hear about events & services from Brothers " +
            //                     "for Life?",
            //                     "1. Yes",
            //                     "2. No"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_consent; op date < 6 weeks ago", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "4", "5")
            //             .check.interaction({
            //                 state: "state_consent",
            //                 reply: [
            //                     "Do you consent to:",
            //                     "- Receiving some SMSs on public holidays, " +
            //                     "weekends & before 8am?",
            //                     "- Having ur cell# & language info stored so we can" +
            //                     " send u SMSs?",
            //                     "1. Yes",
            //                     "2. No"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_end_registration", function() {
            //         return tester
            //             .setup.user.addr("082111")
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "4", "5", "1")
            //             .check.interaction({
            //                 state: "state_end_registration",
            //                 reply: [
            //                     "Thank you. You are now subscrbd to MMC msgs. ",
            //                     "Remember if u hav prolonged pain, visit ur ",
            //                     "nearest clinic. Call 0800212685 or send a ",
            //                     "please call me to 0828816202"
            //                 ].join("")
            //             })
            //             .check(function(api) {
            //                 var contact = api.contacts.store[0];
            //                 assert.equal(contact.extra.is_registered, "true");
            //                 assert.equal(contact.extra.consent, "true");
            //                 assert.equal(contact.extra.language_choice, 'en');
            //                 assert.equal(contact.extra.date_of_op, "20150405");
            //             })
            //             .check(function(api) {
            //                 var metrics = api.metrics.stores.ussd_app_test;
            //                 assert.equal(Object.keys(metrics).length, 5);
            //                 assert.deepEqual(metrics['ussd.post_op.registrations'].values, [1]);
            //             })
            //             .check(function(api) {
            //                 var smses = _.where(api.outbound.store, {
            //                     endpoint: 'sms'
            //                 });
            //                 var sms = smses[0];
            //                 assert.equal(smses.length, 1);
            //                 assert.equal(sms.content,
            //                     "Thanks for subscribing to MMC SMSs. We send SMS early in morning to " +
            //                     "help care for ur wound. To unsubscribe reply 'stop'. Keep your SIM in to get SMS."
            //                 );
            //                 assert.equal(sms.to_addr, '+082111');
            //             })
            //             .run();
            //     });
            //     it("to state_bfl_join", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "5", "13", "1")
            //             .check.interaction({
            //                 state: "state_bfl_join",
            //                 reply: [
            //                     "Thank you. You will now receive Brothers for" +
            //                     " Life updates. You can opt out at any" +
            //                     " point by replying STOP to an SMS you receive.",
            //                     "1. Main Menu",
            //                     "2. Exit"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_main_menu (user added to BFL group)", function() {
            //         return tester
            //             .setup.user.addr('082111')
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "5", "13", "1", "1")
            //             .check.interaction({
            //                 state: "state_start"
            //             })
            //             .check(function(api) {
            //                 var contact = api.contacts.store[0];
            //                 assert.equal(contact.extra.bfl_member, "true");
            //                 assert.deepEqual(contact.groups, ["bfl_key"]);
            //             })
            //             .check(function(api) {
            //                 var metrics = api.metrics.stores.ussd_app_test;
            //                 assert.equal(Object.keys(metrics).length, 6);
            //                 assert.deepEqual(metrics['ussd.joined.bfl'].values, [1]);
            //             })
            //             .run();
            //     });
            //     it("to state_end (user added to BFL group)", function() {
            //         return tester
            //             .setup.user.addr('082111')
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "5", "13", "1", "2")
            //             .check.interaction({
            //                 state: "state_end"
            //             })
            //             .check(function(api) {
            //                 var contact = api.contacts.store[0];
            //                 assert.equal(contact.extra.bfl_member, "true");
            //                 assert.deepEqual(contact.groups, ["bfl_key"]);
            //             })
            //             .run();
            //     });
            //     it("to state_bfl_no_join", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "5", "13", "2")
            //             .check.interaction({
            //                 state: "state_bfl_no_join",
            //                 reply: [
            //                     "You have selected not to receive Brothers for" +
            //                     " Life updates. You can join any time in" +
            //                     " the future by dialling *120*662#.",
            //                     "1. Main Menu",
            //                     "2. Exit"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_main_menu (page 1) via BFL state", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "5", "13", "2", "1")
            //             .check.interaction({
            //                 state: "state_main_menu",
            //                 reply: [
            //                     "Medical Male Circumcision (MMC):",
            //                     "1. Find a clinic",
            //                     // "1. Speak to an expert for FREE",
            //                     "2. Get FREE SMSs about your MMC recovery",
            //                     "3. Rate your clinic's MMC service",
            //                     "4. Join Brothers for Life",
            //                     "5. More",
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_consent_withheld (flow from main menu options 1 & 2)", function() {
            //         return tester
            //             .setup.user.addr('082111')
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "1", "2")
            //             .check.interaction({
            //                 state: "state_consent_withheld",
            //                 reply: [
            //                     "Without your consent, we cannot send you messages.",
            //                     "1. Main Menu",
            //                     "2. Back",
            //                     "3. Exit"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_end via state_consent_withheld", function() {
            //         return tester
            //             .setup.user.addr('082111')
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "1", "2", "3")
            //             .check.interaction({
            //                 state: "state_end",
            //                 reply: "Thanks for using the *120*662# MMC service! " +
            //                     "Dial back anytime to find MMC clinics, sign up " +
            //                     "for healing SMSs or find more info about MMC " +
            //                     "(20c/20sec) Yenzakahle!"
            //             })
            //             .run();
            //     });
            //     it("to state_consent via state_consent_withheld", function() {
            //         return tester
            //             .setup.user.addr('082111')
            //             .setup.user.state("state_main_menu")
            //             .inputs("2", "1", "2", "2")
            //             .check.interaction({
            //                 state: "state_consent",
            //                 reply: [
            //                     "Do you consent to:\n" +
            //                     "- Receiving some SMSs on public holidays, " +
            //                     "weekends & before 8am?\n" +
            //                     "- Having ur cell# & language info stored so we " +
            //                     "can send u SMSs?",
            //                     "1. Yes",
            //                     "2. No"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            // });

            // describe("(Service rating)", function() {
            //     it("to state_servicerating_location", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("3")
            //             .check.interaction({
            //                 state: "state_servicerating_location",
            //                 reply: [
            //                     "At which clinic did you get circumcised? Please",
            //                     " be specific with the name and location. e.g.",
            //                     " Peterville Clinic, Rivonia, Johannesburg."
            //                 ].join("")
            //             })
            //             .run();
            //     });
            //     it("to state_servicerating_would_recommend", function() {
            //         return tester
            //             .setup.user.state("state_servicerating_location")
            //             .inputs("User entered location")
            //             .check.interaction({
            //                 state: "state_servicerating_would_recommend",
            //                 reply: [
            //                     "Would you recommend a friend to the clinic" +
            //                     " where you got circumcised?",
            //                     "1. Yes",
            //                     "2. No",
            //                     "3. I have not been circumcised"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_servicerating_end_negative", function() {
            //         return tester
            //             .setup.user.state("state_servicerating_location")
            //             .inputs("User entered location", "3")
            //             .check.interaction({
            //                 state: "state_servicerating_end_negative",
            //                 reply: [
            //                     "Thank you for your interest. We are only looking" +
            //                     " for ratings from men who have had" +
            //                     " their circumcision at a clinic recently.",
            //                     "1. Main Menu",
            //                     "2. Exit"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_servicerating_rating", function() {
            //         return tester
            //             .setup.user.state("state_servicerating_location")
            //             .inputs("User entered location", "1")
            //             .check.interaction({
            //                 state: "state_servicerating_rating",
            //                 reply: [
            //                     "How would you rate the attitude of the health" +
            //                     " care workers at the clinic where you got " +
            //                     "circumcised?",
            //                     "1. Very bad",
            //                     "2. Bad",
            //                     "3. OK",
            //                     "4. Good",
            //                     "5. Excellent"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_servicerating_subscribed_to_post_op_sms", function() {
            //         return tester
            //             .setup.user.state("state_servicerating_location")
            //             .inputs("User entered location", "1", "3")
            //             .check.interaction({
            //                 state: "state_servicerating_subscribed_to_post_op_sms",
            //                 reply: [
            //                     "Did you subscribe to the post op SMS service?",
            //                     "1. Yes I found it helpful",
            //                     "2. Yes but it was not helpful",
            //                     "3. No I chose not to subscribe",
            //                     "4. I didn't know about it"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_servicerating_end_positive", function() {
            //         return tester
            //             .setup.user.state("state_servicerating_location")
            //             .inputs("User entered location", "1", "5", "1")
            //             .check.interaction({
            //                 state: "state_servicerating_end_positive",
            //                 reply: [
            //                     "Thanks for rating your circumcision experience." +
            //                     " We appreciate your feedback, it will" +
            //                     " help us improve our MMC service.",
            //                     "1. Main Menu",
            //                     "2. Exit"
            //                 ].join("\n")
            //             })
            //             .check(function(api, im) {
            //                 assert.deepEqual(im.user.answers, {
            //                     "state_servicerating_location": "User entered location",
            //                     "state_servicerating_would_recommend": "servicerating_yes_recommend",
            //                     "state_servicerating_rating": "servicerating_excellent",
            //                     "state_servicerating_subscribed_to_post_op_sms": "servicerating_subscribed_helpful"
            //                 });
            //             })
            //             .check(function(api) {
            //                 var contact = _.find(api.contacts.store, {
            //                     msisdn: '+27123456789'
            //                 });
            //                 assert.equal(contact.extra.state_servicerating_location, "User entered location");
            //                 assert.equal(contact.extra.state_servicerating_would_recommend, "servicerating_yes_recommend");
            //                 assert.equal(contact.extra.state_servicerating_rating, "servicerating_excellent");
            //                 assert.equal(contact.extra.state_servicerating_subscribed_to_post_op_sms, "servicerating_subscribed_helpful");
            //             })
            //             .run();
            //     });
            // });

            // describe("(Brothers for Life)", function() {
            //     it("to state_bfl_start", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("4")
            //             .check.interaction({
            //                 state: "state_bfl_start",
            //                 reply: [
            //                     "Join Brothers for Life and we'll send you " +
            //                     "free SMSs about ur health, upcoming events & " +
            //                     "services for men. brothersforlife.org T&Cs " +
            //                     "apply.",
            //                     "1. Join",
            //                     "2. No thanks"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_bfl_join", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("4", "1")
            //             .check.interaction({
            //                 state: "state_bfl_join",
            //                 reply: [
            //                     "Thank you. You will now receive Brothers for" +
            //                     " Life updates. You can opt out at any" +
            //                     " point by replying STOP to an SMS you receive.",
            //                     "1. Main Menu",
            //                     "2. Exit"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_bfl_no_join", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("4", "2")
            //             .check.interaction({
            //                 state: "state_bfl_no_join",
            //                 reply: [
            //                     "You have selected not to receive Brothers for" +
            //                     " Life updates. You can join any time in" +
            //                     " the future by dialling *120*662#.",
            //                     "1. Main Menu",
            //                     "2. Exit"
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            //     it("to state_end via decision to join (user added to BFL group)", function() {
            //         return tester
            //             .setup.user.addr('082111')
            //             .setup.user.state("state_main_menu")
            //             .inputs("4", "1", "2")
            //             .check.interaction({
            //                 state: "state_end",
            //                 reply: "Thanks for using the *120*662# MMC service! " +
            //                     "Dial back anytime to find MMC clinics, sign up " +
            //                     "for healing SMSs or find more info about MMC " +
            //                     "(20c/20sec) Yenzakahle!"
            //             })
            //             .check(function(api) {
            //                 var contact = api.contacts.store[0];
            //                 assert.equal(contact.extra.bfl_member, "true");
            //                 assert.deepEqual(contact.groups, ["bfl_key"]);
            //             })
            //             .run();
            //     });
            //     it("to state_end via decision not to join", function() {
            //         return tester
            //             .setup.user.state("state_main_menu")
            //             .inputs("4", "2", "2")
            //             .check.interaction({
            //                 state: "state_end",
            //                 reply: "Thanks for using the *120*662# MMC service! " +
            //                     "Dial back anytime to find MMC clinics, sign up " +
            //                     "for healing SMSs or find more info about MMC " +
            //                     "(20c/20sec) Yenzakahle!"
            //             })
            //             .run();
            //     });
            //     it("to state_main_menu via state_bfl_join (user added to BFL group)", function() {
            //         return tester
            //             .setup.user.addr('082111')
            //             .setup.user.state("state_main_menu")
            //             .inputs("4", "1", "1")
            //             .check.interaction({
            //                 state: "state_start",
            //                 reply: [
            //                     "Welcome to Healthsites. What type of service are" +
            //                     " you looking for?",
            //                     "1. Circumcision",
            //                     "2. HIV Services",
            //                     "3. Gender Based Violence"
            //                 ].join("\n")
            //             })
            //             .check(function(api) {
            //                 var contact = api.contacts.store[0];
            //                 assert.equal(contact.extra.bfl_member, "true");
            //                 assert.deepEqual(contact.groups, ["bfl_key"]);
            //             })
            //             .run();
            //     });
            //     it("to state_main_menu via state_bfl_no_join", function() {
            //         return tester
            //             .setup.user.state("state_mmc_menu")
            //             .inputs("4", "2", "1")
            //             .check.interaction({
            //                 state: "state_start",
            //                 reply: [
            //                     "Medical Male Circumcision (MMC):",
            //                     "1. Find a clinic",
            //                     // "1. Speak to an expert for FREE",
            //                     "2. Get FREE SMSs about your MMC recovery",
            //                     "3. Rate your clinic's MMC service",
            //                     "4. Join Brothers for Life",
            //                     "5. More",
            //                 ].join("\n")
            //             })
            //             .run();
            //     });
            // });
        });
    });
});
