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
            "contact_key": "63ee4fa9-6888-4f0c-065a-939dc2473a99",
            "lang": "en",
            "message_set": "/subscription/api/v1/message_set/12/",
            "next_sequence_number": 1,
            "schedule": "/subscription/api/v1/periodic_task/1/",
            "to_addr": "+082111",
            "user_account": "4a11907a-4cc4-415a-9011-58251e15e2b4"
          }
        },
        "response": {
          "code": 201,
          "data": {
            "active": true,
            "completed": false,
            "contact_key": "63ee4fa9-6888-4f0c-065a-939dc2473a99",
            "created_at": "2014-10-30T11:34:15.213552",
            "id": 1,
            "lang": "en",
            "message_set": "/subscription/api/v1/message_set/1/2",
            "next_sequence_number": 1,
            "process_status": 0,
            "resource_uri": "/subscription/api/v1/subscription/1/",
            "schedule": "/subscription/api/v1/periodic_task/1/",
            "to_addr": "+082111",
            "updated_at": "2014-10-30T11:34:15.213601",
            "user_account": "4a11907a-4cc4-415a-9011-58251e15e2b4"
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
