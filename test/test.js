const assert = require( 'assert' );
const stomp = require( 'stompjs' );
const mqtt = require('mqtt');
const deepstream = require( 'deepstream.io-client-js' );
const utils = require( '../src/utils' );
const DsApolloBridge = require( '../src/ds-apollo-bridge' );
const USERNAME = 'admin';
const PASSWORD = 'password';
const TOPIC = 'dfh434';
const MQTT_URL = 'mqtt://localhost:61613';
const MQTT_CREDENTIALS = { username: USERNAME, password: PASSWORD };
const DS_URL = 'wss://154.deepstreamhub.com?apiKey=164f7d4a-e98e-4015-b3a3-c986b5004be1';
const DS_CREDENTIALS = {};


describe('cross protocol messaging', function() {
	var stompClient, mqttClient, dsClient;
	var mqttMessages = [];
	var stompMessages = [];
	var dsMessages = [];

	it( 'creates the deepstream apollo bridge', function( next ) {
		var dsApolloBridge = new DsApolloBridge( DS_URL, DS_CREDENTIALS, MQTT_URL, MQTT_CREDENTIALS );
		dsApolloBridge.on( 'ready', next );
	});

	it( 'connects the deepstream client', function( next ){
		dsClient = deepstream( DS_URL ).login( DS_CREDENTIALS, (ok, err) => {
			if( ok ) {
				next();
			} else {
				throw err;
			}
		});

		dsClient.event.subscribe( TOPIC, msg => {
			dsMessages.push( msg );
		})
	});

	it( 'connects the STOMP client', function( next ){
		stompClient = stomp.overTCP( 'localhost', 61613 );
		stompClient.connect( USERNAME, PASSWORD, function(){
			assert( true, 'STOMP Client connected via TCP' );
			stompClient.subscribe( '/topic/' + TOPIC, function( message ){
				stompMessages.push( message.body );
			});
			next();
		}, function(){
			assert( false, 'STOMP Client failed to connect via TCP' );
			next();
		});
	});

	it( 'connects the MQTT client', function( next ){
		mqttClient = mqtt.connect( MQTT_URL, MQTT_CREDENTIALS );

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
			mqttMessages.push( utils.normalizeMessage( message.toString() ) );
		});
	});

	it( 'sends a message via STOMP and receives it across all other clients', function( next ){
		assert.equal( mqttMessages.length, 0, 'mqtt has received 0 messages yet' );
		assert.equal( stompMessages.length, 0, 'stomp has received 0 messages yet' );
		assert.equal( dsMessages.length, 0, 'ds has received 0 messages yet' );

		stompClient.send( '/topic/' + TOPIC, {}, 'msg-a' );

		setTimeout(function(){
			assert.equal( mqttMessages.length, 1, 'MQTT has received the message from STOMP' );
			assert.equal( mqttMessages[ 0 ], 'msg-a', 'MQTT received the right message' );
			assert.equal( stompMessages.length, 1, 'STOMP has received the message from STOMP' );
			assert.equal( stompMessages[ 0 ], 'msg-a', 'STOMP received the right message' );
			assert.equal( dsMessages.length, 1, 'DS has received the message from STOMP' );
			assert.equal( dsMessages[ 0 ], 'msg-a', 'DS received the right message' );
			next();
		}, 50 );
	});

	it( 'sends a message via MQTT and receives it across all other clients', function( next ){
		assert.equal( mqttMessages.length, 1, 'mqtt has received 1 messages yet' );
		assert.equal( stompMessages.length, 1, 'stomp has received 1 messages yet' );
		assert.equal( dsMessages.length, 1, 'ds has received 1 messages yet' );

		mqttClient.publish( TOPIC, 'msg-b');

		setTimeout(function(){
			assert.equal( mqttMessages.length, 2, 'STOMP has received the message from MQTT' );
			assert.equal( mqttMessages[ 1 ], 'msg-b', 'STOMP received the right message' );
			assert.equal( stompMessages.length, 2, 'MQTT has received the message from STOMP' );
			assert.equal( stompMessages[ 1 ], 'msg-b', 'MQTT received the right message' );
			assert.equal( dsMessages.length, 2, 'DS has received the message from STOMP' );
			assert.equal( dsMessages[ 1 ], 'msg-b', 'DS received the right message' );
			next();
		}, 50 );
	});
});