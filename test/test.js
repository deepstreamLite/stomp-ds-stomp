const assert = require( 'assert' );
const stomp = require( 'stompjs' );
const mqtt = require('mqtt');
const USERNAME = 'admin';
const PASSWORD = 'password';
const TOPIC = 'dfh434';

function normalizeMessage( msg ) {
	if( msg.substr( 0, 7 ) === 'MESSAGE' ) {
		//Assume Stomp Message
		return stomp.Frame.unmarshall( msg )[ 0 ].body;
	} else {
		return msg;
	}
}

describe('cross protocol messaging', function() {
	var stompClient, mqttClient;
	var mqttMessages = [];
	var stompMessages = [];

	it( 'connects the STOMP client', function( next ){
		stompClient = stomp.overTCP( 'localhost', 61613 );
		stompClient.connect( USERNAME, PASSWORD, function(){
			assert( true, 'STOMP Client connected via TCP' );
			stompClient.subscribe( '/topic/' + TOPIC, function( message ){
				stompMessages.push( message.body );
			});
			next();
		}, function(){
			console.log( arguments );
			assert( false, 'STOMP Client failed to connect via TCP' );
			next();
		});
	})

	it( 'connects the MQTT client', function( next ){
		mqttClient = mqtt.connect('mqtt://localhost:61613', {username: USERNAME, password: PASSWORD });
		
		mqttClient.on( 'connect', function(){
			mqttClient.subscribe( TOPIC, next );
			assert( true, 'MQTT Client connected via TCP' );
		})

		mqttClient.on( 'error', function(){
			console.log( arguments );
			assert( false, 'MQTT Client failed to connect via TCP' );
			next();
		})

		mqttClient.on('message', function (topic, message, packet ) {
			mqttMessages.push( normalizeMessage( message.toString() ) );
		});
	});

	it( 'sends a message via STOMP and receives it across all other clients', function( next ){
		assert.equal( mqttMessages.length, 0, 'mqtt has received 0 messages yet' );
		assert.equal( stompMessages.length, 0, 'stomp has received 0 messages yet' );

		stompClient.send( '/topic/' + TOPIC, {}, 'msg-a' );

		setTimeout(function(){
			assert.equal( mqttMessages.length, 1, 'MQTT has received the message from STOMP' );
			assert.equal( mqttMessages[ 0 ], 'msg-a', 'MQTT received the right message' );
			assert.equal( stompMessages.length, 1, 'STOMP has received the message from STOMP' );
			assert.equal( stompMessages[ 0 ], 'msg-a', 'STOMP received the right message' );
			next();
		}, 50 );
	});

	it( 'sends a message via MQTT and receives it across all other clients', function( next ){
		assert.equal( mqttMessages.length, 1, 'mqtt has received 1 messages yet' );
		assert.equal( stompMessages.length, 1, 'stomp has received 1 messages yet' );

		mqttClient.publish( TOPIC, 'msg-b');

		setTimeout(function(){
			assert.equal( mqttMessages.length, 2, 'STOMP has received the message from MQTT' );
			assert.equal( mqttMessages[ 1 ], 'msg-b', 'STOMP received the right message' );
			assert.equal( stompMessages.length, 2, 'MQTT has received the message from STOMP' );
			assert.equal( stompMessages[ 1 ], 'msg-b', 'MQTT received the right message' );
			next();
		}, 50 );
	});
});