
exports.normalizeMessage = function( msg ) {
	if( msg.substr( 0, 7 ) === 'MESSAGE' ) {
		//Assume Stomp Message
		return stomp.Frame.unmarshall( msg )[ 0 ].body;
	} else {
		return msg;
	}
};