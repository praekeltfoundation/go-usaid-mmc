module.exports = function() {
    return [

    {
        "request": {
          "method": "POST",
          'headers': {
                'Authorization': ['ApiKey test_user:test_key'],
                'Content-Type': ['application/json']
            },
          "url": "http://fixture/subscription/api/v1/subscription/",
          "data": {
            "contact_key": "2",
            "lang": "en",
            "message_set": "/subscription/api/v1/message_set/1/",
            "next_sequence_number": 1,
            "schedule": "/api/v1/periodic_task/3/",
            "to_addr": "0823334444",
            "user_account": "1"
          }
        },
        "response": {
          "code": 201,
          "data": {
            "active": true,
            "completed": false,
            "contact_key": "2",
            "created_at": "2014-10-30T11:34:15.213552",
            "id": 1,
            "lang": "en",
            "message_set": "/subscription/api/v1/message_set/1/",
            "next_sequence_number": 1,
            "process_status": 0,
            "resource_uri": "/subscription/api/v1/subscription/1/",
            "schedule": "/subscription/api/v1/periodic_task/1/",
            "to_addr": "0823334444",
            "updated_at": "2014-10-30T11:34:15.213601",
            "user_account": "1"
          }
        }
    },

    {
        "request": {
            "method": "POST",
            "url": "http://example.com",
            "data": {
                "bar": "baz"
            }
        },
        "response": {
            "code": 200,
            "data": {
                "ham": "spam"
            }
        }
    }

    ];
};
