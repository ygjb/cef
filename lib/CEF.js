var dgram = require("dgram");
var os = require("os");
var util = require("util");
var SystemLogger = require("./syslog.js");

function CEFException(message)
{
	this.message= message == 'undefined' ? "Unknown CEF Exception" : message;
	this.name = "CEFException"
}

function prefixFilter(prefix)
{
	p = util.format("%s", prefix);
	// naively escape 
	p.replace(/([^\\])([|]{1})/g,"$1\$2");
	// escape dangling \s
	p.replace(/([\\]{2})([=|]{1})/g,"$1\$2")
	// remove newlines
	p.replace(/([\r\n]+)/g, "");
	return p;
}

/* restrict values to alphanumeric */
function keyFilter(key)
{
	k = util.format("%s", key);
	k.replace(/([^a-zA-Z0-9])/g,"");
	if (k.length > 1023)
		k = k.slice(0, 1023);
	return k;
}

/* values must:
 *  - escape \|=
 *  - collapse \r\ns into a single \r or \n; since the spec leaves us the choice, we collapse to \n
 *  - limit field length to 1023
 */
function valueFilter(value)
{
	v = util.format("%s", value);
	// naively escape 
	v.replace(/([^\\])([=|]{1})/g,"$1\$2");
	// escape dangling \s
	v.replace(/([\\]{2})([=|]{1})/g,"$1\$2")
	// strip newlines
	v.replace(/([\r\n]+)/g, "\n");
	
	if (v.length > 1023)
		v = v.slice(0, 1023);
	return v;
}

function extractNamedValues(target, source, params, filter)
{
	try {
		for (i = 0; i < params.length; i++)
		{
			target[params[i]] = filter(source[params[i]]);
		}
	}
	catch (err)
	{
		throw new CEFException("Unable to extract required keys (" + err + ")");
	}
}

function extractDictionary(target, source, keyFilter, valueFilter)
{
	for(param in source)
	{
		target[keyFilter(param)] = valueFilter(source[param])
	}
}


function filterCEF(params)
{
	var prefix = {}
	// Extract Prefix Data
	extractNamedValues(prefix, params['config'], ['vendor', 'product', 'version'], prefixFilter)	
	extractNamedValues(prefix, params, ['signature', 'severity', 'name'], prefixFilter);
	
	sev = parseInt(prefix['severity']);
	if ((typeof(sev) != 'number') || 
	    (sev < 0) ||
	    (sev >10))
		throw new CEFException("Invalid severity.")
	
	// Extract Extensions (process environ first, allow extensions to clobber environment if the dev wants to)
	var extensions = {}
	extractDictionary(extensions, params['environ'], keyFilter, valueFilter);
	extractDictionary(extensions, params['extensions'], keyFilter, valueFilter)
	
	return { prefix : prefix, extensions : extensions }
}

	
/*
 * Writes a CEF entry to the object
 *  signature - a unique identifier used to identify the type of entry in ArcSight
 *  name - a text description of the event
 *  severity - a value between [0,10], 0 being lowest severity, and 10 the highest
 */
exports.generateCEF = function(signature, name, severity, environ, config, extensions)
{
	try
	{
		var params = filterCEF(
		{
			config : config,
			environ : environ,
			extensions : extensions,
			signature : signature,
			name : name,
			severity : severity
		});
	}
	catch (err)
	{
		throw new CEFException("Unable to extract parameters: " + err) 
	}
	return exports.formatCEF(params);
}


	
/*
 * 
 */
exports.syslog = function(signature, name, severity, environ, config, extensions, syslog)
{
	cef = exports.generateCEF(signature, name, severity, environ, config, extensions);
	logger = SystemLogger.getInstance();
	if (syslog != null)
		logger.set(syslog);
	logger.log(cef);
}

            
/*
 *	Accept set of prefix values, and a set of extensions, and emit a CEF entry.
 */
exports.formatCEF = function(params)
{
	extension = "";
	for (key in params['extensions'])
		extension = extension + util.format("%s=%s ", key, params['extensions'][key]);
	//	CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
	cef = util.format("CEF:%s|%s|%s|%s|%s|%s|%s|%s",
		"0", // Version, but we only emit CEF0
		params['prefix']['vendor'],
		params['prefix']['product'],
		params['prefix']['version'],
		params['prefix']['signature'],
		params['prefix']['name'],
		params['prefix']['severity'],
		extension
		);
	
	return cef.toString("UTF-8");
}


/* CEF Helpers */
exports.environFromHTTP = function(request) 
{ 
	try {
		return {
			requestMethod : request['method'],
			request : request.url,
			dest : request['headers']['host'],
			requestClientApplication : request['headers']['user-agent'],
			host : os.hostname()
		};
	} catch(err)
	{
		throw new CEFException("Unable to get request properties. (" + err + ")");
	}
}

exports.environFromParams = function(method, uri, host, agent) {
	return { requestMethod : method, request : uri, dest : host, requestClientApplication : agent, host : os.hostname()};
} 