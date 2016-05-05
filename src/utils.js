/*jshint -W083 */
var Q = require('q');
var vumigo = require('vumigo_v02');
var moment = require('moment');
//var JsonApi = vumigo.http.api.JsonApi;
var Choice = vumigo.states.Choice;
var HttpApi = vumigo.http.api.HttpApi;

// UTILS
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
    is_date_diff_less_than_6weeks: function(im, date) {
        var today = go.utils.get_today(im.config);
        var d = new moment(date, 'YYYYMMDD');

        return d.diff(today, "weeks") < 6;
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

    "commas": "commas"

};
