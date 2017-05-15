# Mercurius Union

This repo is an api layer on card reader, it controls the whole authentication procdure of voting. Mrecurius-union interacts with staff through web front-end ([mercurius-panel]) and sending reqest to [auth server] and [vote server], in addition, it receives card id of student id card from another card reader project through standard HTTP request.

## Terminology
- [auth server]: A server handles the identity verification process and ballot-casting.
- [vote server]: A server handles the voting process.
- card reader: A device which can read student identity card, this project runs on it.
- vote tablet: Tablets for voting.
- auth tablet: Tablet for staff to receive infomation from auth server and vote server. Also referes it as client.

## websocket events 
The content format is JSON encoded by default.

### authenticated (card reader -> client)
Emit this event when a student identity card is been accepted by [auth server]. Then the client can emit a event respectively to accept or reject this student id card.

#### Data format

- id
- type
- department

### confirmed (card reader -> client)
After received `accept` event, card reader will interact with [auth server] and [vote server] to complete the whole authentication process, and return a number that indicates a vote tablet.
- student_id
- slot: to indicate the number of the tablet

### message  (card reader -> client)
Messages including error message from [auth server] and [vote server].
A raw string.

### attached (card reader -> client)
Inform that card is been attached.
A raw string contains student id.

### station (card reader -> client)

Station name.

A raw string. 

### accept / confirm (client -> card reader)
Accept a student's voting request.
### reject / report (client -> card reader)
Reject a student's voting request.
### dismiss (client -> card reader)
Clear message

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

## Author

Squirrel a.k.a. azdkj532

## Contributors

* Andy Pan
* Katrina Chan
* Hsu Karinsu

[auth server]: https://github.com/NTUOSC/ntu-vote-auth-server
[vote server]: http://github.com/mousems/NTUvoteV2
[mercurius-panel]: https://github.com/NTUOSC/mercurius-panel