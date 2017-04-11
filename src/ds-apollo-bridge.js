const EventEmitter = require( 'events' ).Emitter;

module.exports = class DsApolloBridge extends EventEmitter{
	constructor( dsUrl, dsCredentials, mqttUrl, mqttCredentials ) {
		super();

		this._mqttClient = mqtt.connect( mqttUrl, mqttCredentials );
		this._mqttClient.on( 'connect', this._onMqttConnect.bind( this ) );
		this._mqttClient.on( 'error', this._onError.bind( this, 'MQTT' ) );
		this._mqttClient.on( 'message', this._onMqttMessage.bind( this ) );

		this._dsClient = deepstream( dsUrl ).login( dsCredentials, this._onDsLogin.bind( this ) );

		this._mqttReady = false;
		this._dsReady = false;
	}

	_onMqttConnect() {
		this._mqttClient.subscribe( *, () => {
			this._mqttReady = true;
			this._checkReady();
		});
	}

	_onMqttMessage( topic, message, packet ) {
		this._dsClient.event.emit( topic, utils.normalizeMessage( message.toString() ) );
	}

	_onDsLogin( success ) {
		if( !success, err ) {
			this._onError( 'ds', err );
		} else {
			this._dsReady = true;
			this._checkReady();
		}
	}

	_checkReady() {
		if( this._mqttReady && this._dsReady ) {
			this.emit( 'ready' );
		}
	}

	_onError( source, message ) {
		console.log( source + ' error: ' + message.toString() );
	}
}