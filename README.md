<<<<<<< HEAD
# Mercurius Union
This repo is an api layer on card reader, it controls the whole authentication procdure of voting. Mrecurius-union interacts with staff through web front-end ([mercurius-panel]) and sending reqest to [auth server] and [vote server], in addition, it receives card id of student id card from another card reader project through standard HTTP request.

## websocket events
The content format is JSON encoded by default.

### authenticated
Emit this event when a student identity card is been accepted by [auth server]. Then front-end can emit a event to `accept`/`reject` this student id card.
#### Data format
- id
- type
- department

### confirmed
After receiving `accept` event, this server will interact with [auth server] and [vote server] to complete the whole authentication procdure.
- student_id
- slot: to indicate the number of the tablet

### message 
Any message including error message from [auth server] and [vote server].
A raw string.

### station
Station name.
A raw string. 

### connect
### reconnect
### disconnect

## HTTP URI
### `/api/update`
Receive infomation of the card here.
- student_id
- card_id

### `/api/login`
For login [auth server]
- username
- password

[auth server]: https://github.com/NTUOSC/ntu-vote-auth-server
[vote server]: http://github.com/mousems/NTUvoteV2
[mercurius-panel]: https://github.com/NTUOSC/mercurius-panel

# Author

Squirrel a.k.a. azdkj532

# Contributors

* Andy Pan
* Katrina Chan
* Hsu Karinsu
