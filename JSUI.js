/* 
	JSUI Extendscript Dialog Library for working with ScriptUI and JSON data
	(Adobe Photoshop/Illustrator/Bridge)
	Framework by geeklystrips@github

	-----

	Copyright (c) 2015, geeklystrips@gmail.com
	All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

	2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


	http://www.opensource.org/licenses/bsd-license.php

	-----
	
	TODO
	- built-in SVG image support for JSUI.createDialog(), JSUI.prompt(), JSUI.confirm() and JSUI.alert()
	- better handle undefined path / 8103 error (file not saved)
	- fix out-of-range issue with LZW string (feature removed for now)
	- provide components for addVec2, addVec3, addVec4 (for XY, XYZ, RGBA, ARGB)

	- JSUI.alert/message should also support Bridge and InDesign
	- manage orphan properties: strict mode? if not present in default preferences object, ignore
		- JSUI needs a method for standalone properties that do not need to be saved to INI
		- bypass based on provided array of strings during toINIstring process? 

	- add basic support for encoding/decoding LZW (for XMP purposes)
		https://github.com/pieroxy/lz-string/
		https://github.com/pieroxy/lz-string/blob/master/libs/lz-string.js (v1.4.4)

	- colorPicker hexString TextEdit should have support for an onChangingFunction (?)
	- add clamping support for int/float, + safeguard for "," being used as a delimiter
	- support for hybrid ToggleIconButton component fallback to radiobuttons (if one image is missing instead of all images for radiobuttons)
	- method for getting which property from toggleiconbutton array is activated

	- make imgFile target accept arrays to bypass default naming scheme (if typeof imgFile == "object" && imgFile.length != undefined) or (if imgFile instanceof...)
	- Scrollable alert support for cases with overflowing content
	- Better support for JSUI.addImageGrid() types (only supports arrays of strings for now)
	  fix references to  JSUI.PREFS.imageGridColumns & JSUI.PREFS.imageGridRows
	  Using two instances of imageGrids which don't have matching widths and heights will cause issues

	Uses functions adapted from Xbytor's Stdlib.js
	
	throwFileError
	convertFptr
	writeToFile
	readFromFile
	toIniString
	fromIniString
	readIniFile
	writeIniFile 
*/

// persistent namespace
if(typeof JSUI !== "object")
{
	JSUI = {}; 
}

// version
JSUI.version = "1.1.5";

// do some of the stuff differently depending on $.level and software version
JSUI.isESTK = app.name == "ExtendScript Toolkit";
JSUI.isPhotoshop = app.name == "Adobe Photoshop";
JSUI.isIllustrator = app.name == "Adobe Illustrator";
JSUI.isBridge = app.name == "bridge";
JSUI.isIndesign = app.name == "Adobe InDesign";
JSUI.isAfterEffects = app.name == "Adobe AfterEffects";

JSUI.isCS6 = JSUI.isPhotoshop ? app.version.match(/^13\./) != null : false; // photoshop-specific
JSUI.is2020andAbove = JSUI.isPhotoshop ? (parseInt(app.version.match(/^\d.\./)) >= 21) : (parseInt(app.version.match(/^\d.\./)) >= 24); 

//	 system properties
JSUI.isWindows = $.os.match(/windows/i) == "Windows";
JSUI.isWin7 = $.os.match(/windows/i) == "Windows" ? $.os.match(" 6.1 Service Pack ") != null : false;
JSUI.isWin10 = $.os.match(/windows/i) == "Windows" ? $.os.match(" 6.2 Service Pack ") != null : false;
JSUI.is_x64 = JSUI.isWindows ? BridgeTalk.appVersion.match(/\d\d$/) == '64' : true;

JSUI.TOOLNAME = "DEFAULTNAME";
JSUI.TOOLDISPLAYNAME = JSUI.TOOLNAME;

// 	This kind of data is frequently stored in ~/Library/Application Support.
// 	User-specific settings are frequently stored in ~/Library/Preferences
// 	Folder.appData = global, system preferences on OSX. Depending on user rights, applications might have trouble writing to this location.	
// 	Folder.userData = roaming data
	
// JSUI.USERPREFSFOLDER = (JSUI.isWindows ? Folder.appData : "~/Library/Application Support");
// JSUI.USERPREFSFOLDER = (JSUI.isWindows ? Folder.userData : "~/Library/Application Support");

// // OSX user library:			/Users/username/Library/Application Support
// var userData = prompt("Folder.userData value:", userData.fsName);

// // OSX system library		  /Library/Application Support
// //~ var appData = prompt("Folder.appData value:", appData.fsName);

	
//~ JSUI.USERPREFSFOLDER = (JSUI.isWindows ? "~" : "~/Library/Application Support");

JSUI.USERPREFSFOLDER = Folder.userData;
// JSUI.TOOLSPREFSFOLDERNAME = "pslib"; 

JSUI.CONTEXTNAME = ""; // "Unity/", "Unreal/"
JSUI.PROJECTNAME = "Default";

// now writing prefs to a ContextName/ProjectName hierarchy. 
// ProjectName: "Default"
// If you need the context, just assign a name to JSUI.CONTEXTNAME and include trailing "/"
JSUI.TOOLSPREFSFOLDERNAME = "geeklystrips/" + JSUI.CONTEXTNAME + JSUI.PROJECTNAME; 

// include direct support for workspaces, app-based
// JSUI.WORKSPACES = JSUI.TOOLSPREFSFOLDERNAME + ( app.name ? ("/" + app.name.replace("Adobe ", "")) : "" ) + "/workspaces";
JSUI.WORKSPACES = JSUI.TOOLSPREFSFOLDERNAME + "/workspaces" + "/" + app.name;
JSUI.WORKSPACESFOLDER = JSUI.USERPREFSFOLDER + "/" + JSUI.WORKSPACES;


JSUI.INIFILE = JSUI.USERPREFSFOLDER + "/" + JSUI.TOOLSPREFSFOLDERNAME + "/" + JSUI.TOOLNAME + ".ini";
JSUI.INIfileActive = false;

JSUI.JSONFILE = JSUI.USERPREFSFOLDER + "/" + JSUI.TOOLSPREFSFOLDERNAME + "/" + JSUI.TOOLNAME + ".json";
JSUI.JSONfileActive = false;

JSUI.XMLFILE = JSUI.USERPREFSFOLDER + "/" + JSUI.TOOLSPREFSFOLDERNAME + "/" + JSUI.TOOLNAME + ".xml";
JSUI.XMLfileActive = false;

JSUI.autoSave = false;
JSUI.allowTimers = false;
JSUI.PrintINIstringInfo = false;
JSUI.CS6styling = true;

// these must be invoked after defining for JSUI.INIFILE and JSUI.JSONFILE to be valid
// JSUI.CONTEXTNAME and JSUI.PROJECTNAME are optional
JSUI.populateINI = function()
{
	JSUI.INIFILE = new File(JSUI.USERPREFSFOLDER + "/" + JSUI.TOOLSPREFSFOLDERNAME + "/" + JSUI.TOOLNAME + ".ini");
	// JSUI.status.message = "JSUI init OK";
	JSUI.status.message = "";
	JSUI.INIfileActive = true;
	return JSUI.INIFILE.exists;
};

// this must be invoked for JSUI.JSONFILE to be valid
// automatically turns autosaving on
// allows specifying a specific JSON uri to bypass default location
JSUI.populateJSON = function( uri )
{
	// if not File, cast as such
	if(uri)
	{
		if(!(uri instanceof File))
		{
			uri = new File(JSUI.JSONFILE);
		}
	}
	
	JSUI.JSONFILE = uri != undefined ? new File(uri) : new File(JSUI.USERPREFSFOLDER + "/" + JSUI.TOOLSPREFSFOLDERNAME + "/" + JSUI.TOOLNAME + ".json");
	
	// other JSON-related stuff 
	// JSUI.WORKSPACES = JSUI.TOOLSPREFSFOLDERNAME + "/workspaces";
	// JSUI.WORKSPACES = new Folder( JSUI.JSONFILE.parent + "/workspaces");
	// JSUI.WORKSPACES = new Folder( JSUI.JSONFILE.parent + "/workspaces");
	JSUI.WORKSPACESFOLDER = new Folder(JSUI.WORKSPACESFOLDER);

	// JSUI.status.message = "JSON populated";
	JSUI.status.message = "";
	JSUI.autoSave = true;
	JSUI.JSONfileActive = true;
	return JSUI.JSONFILE.exists;
};

// this must be invoked for JSUI.XMLFILE to be valid
JSUI.populateXML = function()
{
	JSUI.XMLFILE = new File(JSUI.USERPREFSFOLDER + "/" + JSUI.TOOLSPREFSFOLDERNAME + "/" + JSUI.TOOLNAME + ".xml");
	// JSUI.status.message = "JSUI init OK";
	JSUI.status.message = "XML populated";
	JSUI.XMLfileActive = true;
	return JSUI.XMLFILE.exists;
};

// INI prefs framework
JSUI.PREFS = {};
JSUI.status = { progress: 0, percent: "0%", message: "" };

//  Layout and graphics 
JSUI.SPACING = (JSUI.isWindows ? 3 : 1); // results will vary depending on OS and version of Adobe software
JSUI.DEFAULTEDITTEXTCHARLENGTH = 35;
JSUI.DEFAULTEDITTEXTWIDTH = 300; // problematic if edittext is in container with alignChildren set to "fill"

JSUI.dark = [0.3255, 0.3255, 0.3255];
JSUI.light = [0.86, 0.86, 0.86];
JSUI.yellow = [1.0, 0.78, 0.04];

JSUI.foregroundDark = [0.27, 0.27, 0.27];
JSUI.backgroundLight = [0.9765, 0.9765, 0.9765];

JSUI.brightnessOriginal = [0.9412, 0.9412, 0.9412];
JSUI.brightnessLightGray = [0.7216, 0.7216, 0.7216];
JSUI.brightnessMediumGray = [0.3255, 0.3255, 0.3255];
JSUI.brightnessDarkGray = [0.1961, 0.1961, 0.1961];

// placeholder: this value is made dynamic later on
JSUI.backgroundColor = [0.3255, 0.3255, 0.3255];

JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.MIDDLECENTER : 5;

// failsafe for cases where the UI framework is used without a debugTxt dialog component	
// if this variable is not replaced, calls by regular functions to modify its state should not cause problems
var debugTxt = {};

JSUI.getScriptFile = function()
{
	var path = $.fileName;
	return new File(path);
};

// these functions return specs relative to JSUI.js (unless included files are flattened)
JSUI.getScriptFolder = function()
{
	var script = JSUI.getScriptFile();
	return script.parent;
};

JSUI.URI = JSUI.getScriptFolder();

JSUI.getScriptFileName = function()
{
	var f = JSUI.getScriptFile();
	return (f ? f.absoluteURI : '');
};


//  these should also use encodeURI/decodeURI
//  convert URL to URI	"C:\\Program Files\\Adobe" becomes "file:///C|/Program%20Files/Adobe" 
JSUI.url2uri = function(url) 
{
	var uri = url.toString().replace(":", "|");
	uri = uri.replace(/\\/g, "/");
	uri = uri.replace(/ /g, "%20");
	uri = "file:///" + uri;
	return uri;
};

// convert URI to URL	"file:///C:/Program%20Files/Adobe" becomes "C:\Program Files\Adobe"
JSUI.uri2url = function(uri) 
{
	var url = uri.toString().substring(8);
	url = url.replace(/\//g, "\\");
	url = url.replace("|", ":");
	url = url.replace(/%20/g, " ");
	return url;
};

// convert file system name to URI	"C:\Program Files\Adobe" becomes "c/Program Files/Adobe"
JSUI.fsname2uri = function(fsname) 
{
	var uri = fsname;
	if($.os.match(/windows/i) == "Windows")
	{
		uri = fsname.toString().replace(":", "");
		uri = uri.replace(/\\/g, "/");

		if( uri[0] != "/" ) uri = "/" + uri;
	}
	return uri;
};

// convert URI name to file system name	"c/Program Files/Adobe" becomes "C:\Program Files\Adobe"
JSUI.uri2fsname = function(uri) 
{
	if(uri instanceof Folder) var fsname = new Folder(uri);
	else	var fsname = new File(uri);
	return fsname.fsName;
};

// launch browser
JSUI.launchURL = function(url)
{
	try
	{
		if(JSUI.isWindows)
		{
			// var u = new File(Folder.temp + '/JSUITmpURL.url');
			var u = new File(Folder.userData + '/JSUITmpURL.url');
			u.open('w');
			u.writeln('[InternetShortcut]\nURL=' + url + '\n');
			u.close();
			u.execute();
			$.sleep(1000);
			u.remove(); 
			return true;
		}

		// .execute() on macOS seems to bring up the File location instead of opening the URL
		// workaround: show prompt...?
		if(!JSUI.isWindows)
		{
			// var msg = "Hello macOS user!\n\nArbitrarily launching URLs is not considered safe by Apple.\nManually copy it to your favorite browser.";
			// var ttl = "URL Prompt";
			// JSUI.prompt( { message: msg, text: url, title: ttl } );

			var htmlStr = '<head>\n'+
			'<meta http-equiv="refresh" content="5; URL="'+url+'" />\n'+
			'</head>\n'+
			'<body>\n'+
			'<p>'+url+'</p>\n'+
			'<p>If you are not redirected within five seconds, <a href="'+url+'">click here</a>.</p>\n'+
			'</body>';

			var u = new File(Folder.userData + '/JSUITmpURL.html');
			u.open('w');
			u.writeln(htmlStr);
			u.close();
			u.execute();
			$.sleep(1000);
			u.remove();
			// error = error
			return true;
			
		}
	}
	catch(e)
	{  
		var errorMsg = "Error launching shortcut.\n"+e;
		prompt(errorMsg, url);
		return false;
	} 
};


// print object properties to javascript console	
JSUI.reflectProperties = function(obj, msg)
{
	if(msg && $.level)
	{
		$.writeln(msg);
	}
	
	var str = "";
	
	var props = obj.reflect.properties;
	
	// Loop through object's properties	
	for (var i in props)
	{
		var val = props[i];
		
		if(val == "__proto__" || val == "__count__" || val == "__class__" || val == "reflect" || val == "Components" || val == "typename")
		{
			continue;
		}
	
		str += "\t" + val + ":\t\t" + obj[val] + "\t\t[" + (typeof obj[val] == "object" ? (obj[val].length != undefined ? "array" : "object") : typeof obj[val]) + "]\n";
	}
	if($.level) $.writeln(str);
	return str;
};

// UI debug function (with ExtendScript Toolkit only)
JSUI.debug = function(str, textfield)
{
	if($.level)
	{
		//if status message is not empty, display
		if (JSUI.status.message != "")
		{
			str += ("\n" + JSUI.status.message + "\n" + ( Math.round(JSUI.status.progress * 100) ) + "%");
		}

		// if textfield is provided
		if(textfield != undefined)
		{
			textfield.text = str;
		}
		// otherwise just assume 
		else
		{
			debugTxt.text = str;
		}
		$.writeln(str);
	}

	//
	//JSUI.status = { progress: 0, message: "" };

	//
	// JSUI.status.progress 
	// JSUI.status.message 
	//

};

// progress bar support
JSUI.status.increment = function( num, absolute )
{
	var absolute = absolute != undefined ? absolute : false;
	if( !isNaN( num ) ) 
	{
		// make sure value is normalized
		if( num >= 0.0 && num <= 1.0 )
		{
			// if absolute, don't actually increment
			if(absolute)
			{
				JSUI.status.progress = num;
			}
			else
			{
				JSUI.status.progress += num;
			}
			JSUI.status.percent = ( Math.round(JSUI.status.progress * 100) ) + "%";
		}
		else
		{
			if($.level) $.writeln( "JSUI.status.increment() failed: provided value is either lower or higher than accepted parameters [" + num + "]" );
		}
	}
	else
	{
		if($.level) $.writeln( "JSUI.status.increment() failed: provided value is not a number [" + num + "]" );
	}
};

// glyph to unicode
JSUI.getUnicode = function(str)
{
	var c = null;
	if(str != "" && str != null)
	{
		c = str.charCodeAt(0); //	 "@" becomes 64 (number)	
		c = c.toString(16).toUpperCase();  // 64 becomes "40" (number converted to string with base 16)
		// c = JSUI.zeropad(c);
		c = c.zeroPad(4);
		
	}
	return c;
}

// unicode to glyph
JSUI.getChar = function(num)
{
	var str = null;
	if(!isNaN(num))
	{
		str = String.fromCharCode(num);
	}
	return str;
}

// pads numbers that don't have a minimum of 4 digits
JSUI.zeropad = function(str)
{
	//  padding string with zeroes	
	// return (str.length < 2 ? "000" + str :  (str.length < 3 ? "00" + str : (str.length < 4 ? "0" + str : (str) ) ) ); // 40 becomes "0040"
	return str.zeroPad(4); // newer string method
}

// with help from Davide
// *bows*
JSUI.getCurrentTheme = function()
{
	var brnessLvl = "kPanelBrightnessMediumGray";

	if(JSUI.isPhotoshop)
	{
		try
		{
			var ref = new ActionReference();
			ref.putProperty(cTID("Prpr"), sTID("interfacePrefs"));
			ref.putEnumerated(cTID("capp"), cTID("Ordn"), cTID("Trgt"));
			var desc = executeActionGet(ref).getObjectValue(sTID("interfacePrefs"));
			brnessLvl = typeIDToStringID(desc.getEnumerationValue(sTID("kuiBrightnessLevel")));
		}
		catch(e)
		{
		}
	}
	else if(JSUI.isIllustrator)
	{
		// default medium gray value
		var uiBrightness = 0.5;
		try
		{
			uiBrightness = app.preferences.getRealPreference("uiBrightness");
  			// < 0.5 = dark, > 0.5 = light
			// 0.0  // dark
			// 0.5  // medium dark
			// 0.5099999905 // medium light
			// 1.0  // light

		}
		catch(e)
		{
		}

		switch(uiBrightness)
		{
			case 1.0 : 
			{
				brnessLvl = "kPanelBrightnessOriginal";
				break;
			}
			case 0.5099999905 : 
			{
				brnessLvl = "kPanelBrightnessLightGray";
				break;
			}
			case 0.5 : 
			{
				brnessLvl = "kPanelBrightnessMediumGray";
				break;
			}
			case 0.0 : 
			{
				brnessLvl = "kPanelBrightnessDarkGray";
				break;
			}
			default :
			{
				brnessLvl = "kPanelBrightnessMediumGray";
				break;
			}
		}
	}
	return brnessLvl;
}

JSUI.getBackgroundColor = function()
{
	var currentTheme = JSUI.getCurrentTheme();
	var color = JSUI.brightnessMediumGray;
	switch(currentTheme)
	{
		case "kPanelBrightnessOriginal" : 
		{
			color = JSUI.brightnessOriginal;
			break;
		}
		case "kPanelBrightnessLightGray" : 
		{
			color = JSUI.brightnessLightGray;
			break;
		}
		case "kPanelBrightnessMediumGray" : 
		{
			color = JSUI.brightnessMediumGray;
			break;
		}
		case "kPanelBrightnessDarkGray" : 
		{
			color = JSUI.brightnessDarkGray;
			break;
		}
		default :
		{
			color = JSUI.brightnessMediumGray;
			break;
		}
	}
	return color;
}

JSUI.setUIbrightness = function( brightness )
{
	if(JSUI.isPhotoshop)
	{
		if(brightness === undefined) return;

		switch(brightness)
		{
			case "light" : brightness = "kPanelBrightnessLightGray"; break;
			case "mediumlight" : brightness = "kPanelBrightnessOriginal"; break;
			case "mediumdark" : brightness = "kPanelBrightnessMediumGray"; break;
			case "dark" : brightness = "kPanelBrightnessMediumGray"; break;
			default : brightness = "kPanelBrightnessMediumGray"; break;
		}

		var brDesc = new ActionDescriptor();
		brDesc.putEnumerated( sTID( "kuiBrightnessLevel" ), sTID( "uiBrightnessLevelEnumType" ), sTID( brightness ));

		var ref = new ActionReference();
		ref.putProperty( sTID( "property" ), sTID( "interfacePrefs" ));
		ref.putEnumerated( sTID( "application" ), sTID( "ordinal" ), sTID( "targetEnum" ));

		var desc = new ActionDescriptor();
		desc.putReference( sTID( "null" ), ref );
		desc.putObject( sTID( "to" ), sTID( "interfacePrefs" ), brDesc );
		executeAction( sTID( "set" ), desc, DialogModes.NO );
		return true;
	}
}

JSUI.backgroundColor = JSUI.getBackgroundColor();

JSUI.createDialog = function( obj )
{
	JSUI.backgroundColor = JSUI.getBackgroundColor();
	var obj = obj != undefined ? obj : {};

	obj.title = obj.title != undefined ? obj.title : " ";
	obj.systemInfo = obj.systemInfo != undefined ?  ( obj.systemInfo ? (JSUI.is_x64 ? " x64" : " x32") : "" ) : "";
	obj.extraInfo = obj.extraInfo != undefined ? obj.extraInfo : "";

	obj.debugInfo = obj.debugInfo != undefined ? obj.debugInfo : false;

	obj.alert = obj.alert != undefined ? obj.alert : false;
	obj.confirm = obj.confirm != undefined ? obj.confirm : false;
	obj.prompt = obj.prompt != undefined ? obj.prompt : false;

	obj.palette = JSUI.isPhotoshop ? false : (obj.palette != undefined ? obj.palette : false);

	// palette mode does not work at all with Photoshop
	var dlg = new Window( ((obj.palette == true) && JSUI.isIllustrator) ? 'palette' : 'dialog', obj.title + obj.systemInfo + "" + obj.extraInfo, undefined, { closeButton:true, resizeable: obj.resizeable ? obj.resizeable : false }); // borderless:true
	if(JSUI.isPhotoshop && JSUI.isCS6 && JSUI.CS6styling) dlg.darkMode();
	dlg.opacity = obj.opacity ? obj.opacity.clamp(0, 1) : 1.0;

	dlg.alignChildren = obj.alignChildren != undefined ? obj.alignChildren : "fill";
	dlg.margins = obj.margins != undefined ? obj.margins : [15,0,15,15];
	dlg.spacing = obj.spacing != undefined ? obj.spacing : 15;

	// if message included, container should not be wider than (dialogWindowWidth - (L+R margins))
	var refMaxWidth = 470;
	if(dlg.margins.length) refMaxWidth = (obj.width != undefined) ? (obj.width-(dlg.margins[0]+dlg.margins[2])) : 470;
	if(obj.maxMessageWidth == undefined) obj.maxMessageWidth = refMaxWidth;

	// header & footer can be modified by other contexts, e.g: dlg._header.alignment = ['left', 'center'];
	var header = dlg.addRow( { margins: [0,0,0,0], spacing: 10, alignChildren: ['fill','fill'], alignment: ['center','center'] } );

	var img = {};
	var imageSize = [ 32, 32 ];

	// display image?
	if(obj.imgFile)
	{
		var groupMargins = [0,0,0,0];
		if(obj.imgMargins instanceof Array) groupMargins = obj.imgMargins;

		var imageContainerSpecs = { 
				margins: groupMargins, 
				spacing: (obj.spacing != undefined) ? obj.spacing : 0,
				alignChildren: ['fill','fill'], 
				alignment: ['center','center']
			};
		var imageContainer = header.addColumn( imageContainerSpecs );

		if(obj.imgWidth || obj.imgHeight)
		{
			if(!isNaN(obj.imgWidth)) obj.imgWidth = obj.imgWidth;
			if(!isNaN(obj.imgHeight)) obj.imgHeight = obj.imgHeight;

			if(isNaN(obj.imgWidth)) obj.imgWidth = obj.imgHeight;
			if(isNaN(obj.imgHeight)) obj.imgHeight = obj.imgWidth;
		}

		if(obj.shapes)
		{
			if(obj.shapes.length)
			{
				if(((!(typeof obj.shapes) == "string")) && (typeof obj.shapes[0] == "string"))
				{
					img = imageContainer.addVectorGraphics( { 
						shapes: obj.shapes, 
						width: obj.imgWidth, 
						height: obj.imgHeight
					} );

					imageSize = [ obj.imgWidth, obj.imgHeight ];
				}
			}
			else
			{
				img = imageContainer.addImage( obj );
			}
		}
		else
		{
			img = imageContainer.addImage( obj );
		}

		// attempt to get image size for layouting
		try
		{
			imageSize = img.image.size;
			imageContainer.preferredSize.width = imageSize[0];
			imageContainer.preferredSize.height = imageSize[1];
		}
		catch(e)
		{
			// JSUI.quickLog(imageSize +"\n"+ e);
		}
	}

	var messageContainer = dlg.addColumn( { margins: [0,0,0,0], spacing: 10, alignChildren: ['fill','fill'], alignment: ['left','top'] } );
	var footer = dlg.addRow( { margins: [0,0,0,0], spacing: 10, alignChildren: ['fill','bottom'], alignment: ['center','bottom'] } );
	var messageText = null;

	if(typeof obj.message === "string")
	{
		var strW = obj.maxMessageWidth;
		var strH = 20;
		var charWidth = dlg.graphics.measureString('w', dlg.graphics.font, obj.maxMessageWidth)[0];
		var lineHeight = dlg.graphics.measureString('|', dlg.graphics.font, obj.maxMessageWidth)[1];
		var lines = 2;
		strH = lines * lineHeight;

		// Dialog.graphics.measureString() does not seem to take linebreaks into account (?)
		// hack: get list of carriage returns and linebreaks
		try{
			var linebreaks = obj.message.indexesOf('\n');
			var strReturns = obj.message.indexesOf('\r');
			strReturns.map(function( r ){ linebreaks.push(r); });

			if(linebreaks.length) lines = linebreaks.length+2;

			var msgTextSize = dlg.graphics.measureString(obj.message, dlg.graphics.font, obj.maxMessageWidth);
			strW = msgTextSize[0]; 
			strH = lines * lineHeight;
			if(strW > obj.maxMessageWidth) strW = obj.maxMessageWidth;
		}catch(e){
			// if the above failed, fallback to estimating widths based on character length
			var msgLines = obj.message.split('\n');
			var lwidth = obj.message.length; // used if no linebreaks
			if(msgLines instanceof Array)
			{
				// get line with most amount of characters
				lwidth = 0;
				if(msgLines.length) lines = msgLines.length+1;
				msgLines.map( function(mline){
					if(mline.length > lwidth) lwidth = mline.length;
				});
			}

			if(lwidth>0)
			{	
				strW = charWidth * lwidth;
				strH = lines * lineHeight;
			}

			if(strW > obj.maxMessageWidth) strW = obj.maxMessageWidth;
		}

		messageText = messageContainer.addStaticText( { 
			text: obj.message, 
			multiline: true, 
			width: strW, 
			height: strH, 
			alignment: img ? "left" : "center"
		} );

		messageText.preferredSize = [ strW, strH ];
	}
	
	dlg._header = header;
	dlg._container = messageContainer;
	dlg._containerText = messageText; // update with dlg._containerText = "updated text"
	dlg._footer = footer;

	// these must be handled after general layout has been established
	dlg.preferredSize.width = obj.width != undefined ? obj.width : 500;
	dlg.preferredSize.height = obj.height != undefined ? obj.height : 200;
	messageContainer.preferredSize.width = dlg.preferredSize.width-(dlg.margins[0]+dlg.margins[2]);

	//
	// DIALOG WINDOW PROFILES
	//
	// alert status
	if(obj.alert)
	{	
		var buttons = dlg.addRow( { spacing: 20, alignment: ['center', 'bottom'] } );

		if(obj.url)
		{
			// // for a custom button
			// buttons.addUrlButton( {
			// 	url: obj.url
			// });

			buttons.addButton( { 
				// imgFile: "img/Info_48px.png", 
				label: "Info...",
				width: 90,
				height: 32,
				alignment: "right", 
				helpTip: "More info:\n\n"+obj.url, url: obj.url } );
		}

		buttons.addCloseButton();

		return dlg;
	}
	// confirm dialog (YES / NO)
	else if(obj.confirm)
	{
		var confirm = null;
		var buttons = dlg.addRow( { spacing: 20, alignment: ['center', 'bottom'] } );

		var no = buttons.addButton( { label: obj.dismissLabel ? obj.dismissLabel : "No", name: "cancel", width: 125, height: 26, alignment: "right" });
		var yes = buttons.addCustomButton( { label: obj.label ? obj.label : "Yes", name: "ok", height: 26, helpTip: obj.helpTip ? obj.helpTip : undefined }); // better results without a defined w+h (?)

		yes.onClick = function()
		{
			confirm = true;
			dlg.close();
		};

		no.onClick = function()
		{
			confirm = false;
			dlg.close();
		};


		if (dlg.show() == 1)
		{ 
			return confirm;
		}
		else
		{
			return confirm;
		}
	}
	// prompt user with edittext + content
	else if(obj.prompt)
	{
		messageContainer.spacing = 15;
		messageContainer.alignChildren = 'fill';
		var textfield = messageContainer.add("edittext", undefined, obj.text != undefined ? obj.text : "");
		if(obj.characters == undefined) textfield.characters = 40;
		if(obj.textWidth != undefined) textfield.preferredSize.width = obj.textWidth;
		if(obj.textHeight != undefined) textfield.preferredSize.height = obj.textHeight;
		
		var buttons = dlg.addRow( { spacing: 20, alignment: ['center', 'bottom'] } );

 		var cancel = buttons.addButton( { label: obj.dismissLabel ? obj.dismissLabel : "Dismiss", name: "cancel", width: 125, height: 26, alignment: "right" });
		var ok = buttons.addCustomButton( { label: (obj.confirmLabel ? obj.confirmLabel : ( obj.label ? obj.label : "Accept")), height: 26, name: "ok", helpTip: obj.helpTip ? obj.helpTip : undefined});

		textfield.active = true;

		if(obj.onClickFunction != undefined)
		{
			ok.onClick = function ()
			{
				obj.onClickFunction( textfield.text );
				dlg.close();
				return textfield.text;
			}
		}

		if (dlg.show() == 1)
		{ 
			return textfield.text;
		}
		else
		{
			return null;
		}
	}
	else
	{
		// include debugTxt statictext at this point
		if(obj.debugInfo && $.level)
		{
			debugText = dlg.addStaticText( { width:500, text:"[Debug text goes here...]\n[...and here.]", disabled:true, multiline:true, height:100 } );

			var debugButtonsGroup = dlg.addRow( {alignChildren: 'fill'} );
			if(JSUI.INIfileActive)
			{
				debugButtonsGroup.addDeleteINIButton();
				debugButtonsGroup.addOpenINILocationButton();
			}
			if(JSUI.JSONfileActive)
			{
				debugButtonsGroup.addDeleteConfigButton();
				debugButtonsGroup.addOpenConfigLocationButton();
			}
		}

		// manage custom onShow function
		if(obj.onShowFunction != undefined) dlg.onShow = obj.onShowFunction;
		else
		{
			// dlg.onShow = function()
			// {
			// 	// // if multiple screens, last one in array is usually the active one
			// 	// var display = $.screens[$.screens.length-1];
			// 	// if(!display.primary) { }

			// 	var w = this.bounds.right - this.bounds.left;
			// 	var h = this.bounds.bottom - this.bounds.top;
			// 	var x = 150;
			// 	var y = 200;
			// 	if(obj.bounds)
			// 	{
			// 		x = obj.bounds[0];
			// 		y = obj.bounds[1];
			// 	}

			// 	this.bounds.left = x;
			// 	this.bounds.top = y;
			// 	this.bounds.right = x+w;
			// 	this.bounds.bottom = y+h;
			// }
		}

		return dlg;
	}
};

// custom alert dialog
JSUI.alert = function( obj )
{
	if(obj == undefined) return null;

	if(typeof obj == "string") 
	{
		var str = obj;
		var obj = { message: str };
	}
	else if(typeof obj == "object" && (obj instanceof File || obj instanceof Folder))
	{
		var f = obj;
		var obj = { message: f.toString() };
	}

	obj.alert = true;
	obj.title = obj.title ? obj.title : " ";

	obj.width = obj.width != undefined ? obj.width : 350; 
	obj.height = obj.height != undefined ? obj.height : 100; 

	if(obj.shapes) obj.imgFile = obj.shapes;

	// if(obj.dismissLabel) obj.label = obj.dismissLabel;
	
	obj.orientation = "column";
	obj.alignChildren = "left";

	var alertDlg = JSUI.createDialog( obj );

	if(alertDlg != undefined)
	{
		alertDlg.show();
	}
	else
	{
		alert( obj.message, obj.title );
	}
};

// softer version of the above function, which is meant as informative more than a warning
JSUI.message = function( messageStr ) //, urlStr)
{
	if(typeof messageStr == "object")
	{
		var obj = messageStr;
	}
	else
	{
		var obj = { message: messageStr };
	}

	JSUI.alert( obj );
};

// informative message + button to launch URL
JSUI.showInfo = function( messageStr, urlStr, imgFile )
{
	if(typeof messageStr == "object")
	{
		var obj = messageStr;
		if(urlStr) obj.url = urlStr;
		if(imgFile) obj.imgFile = imgFile;
	}
	else
	{
		var obj = { message: messageStr };
		if(imgFile) obj.imgFile = imgFile;
		obj.url = urlStr;
	}	

	obj.width = 350; 
	obj.height = 100; 

	JSUI.alert( obj );
};

// confirm dialog
JSUI.confirm = function( obj )
{
	if(obj == undefined) return null;

	if(typeof obj == "string") 
	{
		var str = obj;
		var obj = { message: str };
	}
	else if(typeof obj == "object" && (obj instanceof File || obj instanceof Folder))
	{
		var f = obj;
		var obj = { message: f.toString() };
	}

	obj.confirm = true;
	obj.title = obj.title ? obj.title : "Confirm";

	obj.width = obj.width != undefined ? obj.width : 300; 
	obj.height = obj.height != undefined ? obj.height : 100; 

	if(obj.shapes) obj.imgFile = obj.shapes;

	// obj.orientation = "column";
	// obj.alignChildren = "left";

	var confirmDlg = null;

	try
	{
		confirmDlg = JSUI.createDialog( obj );
	}
	catch(e)
	{
		return confirm( obj.message, undefined, obj.title );
	}

	return confirmDlg;
};

// prompt user
JSUI.prompt = function( obj )
{
	if(obj == undefined) return null;

	if(typeof obj == "string") 
	{
		var str = obj;
		var obj = { message: str};
	}
	else if(typeof obj == "object" && (obj instanceof File || obj instanceof Folder))
	{
		var f = obj;
		var obj = { message: f.toString() };
	}

	obj.prompt = true;
	obj.title = obj.title ? obj.title : "User Prompt";
	obj.text = obj.text != undefined ? obj.text : "";

	obj.width = obj.width != undefined ? obj.width : 400; 
	obj.height = obj.height != undefined ? obj.height : 100; 

	if(obj.shapes) obj.imgFile = obj.shapes;

	obj.orientation = "column";
	obj.alignChildren = "right";

	var promptDlg = null;
	try
	{
		// forceerror = forceerror;
		promptDlg = JSUI.createDialog( obj );
	}
	catch(e)
	{
		return prompt( obj.message, obj.text, obj.title );
	}

	return promptDlg;
};

// extendscript only (relative to script file)
// this will return a File object for relative "../../img/image.png" if found
JSUI.getRelativePath = function( str, folderUri )
{
    if(str == undefined) return;

    var initialFolder = folderUri ? new Folder(folderUri) : JSUI.getScriptFile().parent;
    var relativePathStr = str;

    var matchesDotDotSlash = relativePathStr.match( /\.\.\//g );
    var hasMatch = matchesDotDotSlash != null;
    var relativePathEndStr = hasMatch ? relativePathStr.replace( /\.\.\//g, "") : relativePathStr;

    var targetFolder = initialFolder;

    for(var i = 0; i < matchesDotDotSlash.length; i++)
    {
        targetFolder = targetFolder.parent;
    }

    // will support both "../image.png" and "/../image.png"
    var file = new File(targetFolder + (relativePathEndStr.toString()[0] == "/" ? "" : "/") + relativePathEndStr);

    return file;
};

// this will return a new Folder object based on a location relative to an existing folder
// string "../../folder" if found
// "./folder", "/folder" and "folder" should all be considered valid
JSUI.getRelativeFolderPath = function( str, folderObj )
{
    if(str == undefined) return;
    if(typeof str != "string") return;
    if(folderObj == undefined) return;
    if( !(folderObj instanceof Folder) ) return;

	var folderObj = new Folder(folderObj);
    var relativePathStr = str.trim();
	var relativePathFolderObj = new Folder(relativePathStr);

	// first try and see if folder object exists
	var folderObjExists = folderObj.exists;

	// try and see if provided relativePath is actually a full path
	var relativePathFolderObjExists = relativePathFolderObj.exists;

	// if provided string is a valid path, assume we just need it as is
	if(relativePathFolderObjExists)
	{
		return relativePathFolderObj;
	}

    var matchesDotDotSlash = relativePathStr.match( /\.\.\//g );
	var matchesDotSlash = relativePathStr.match( /^\.\// ) != null; // period in first position: "./folder"

    var hasMatch = matchesDotDotSlash != null;
    var relativePathEndStr = hasMatch ? relativePathStr.replace( /\.\.\//g, "") : relativePathStr;

    var targetFolder = folderObj;

	if(matchesDotDotSlash != null)
	{
		for(var i = 0; i < matchesDotDotSlash.length; i++)
		{
			targetFolder = targetFolder.parent;
		}	
	}

	// if period found in first position, remove it, assuming it means "this directory"
	if(matchesDotSlash) relativePathEndStr = relativePathEndStr.replace(".", "")
    var relativeFolder = new Folder(targetFolder + (relativePathEndStr.toString()[0] == "/" ? "" : "/") + relativePathEndStr);
    return relativeFolder;
};


// standalone logic for ScriptUI image states to use with simple dual true/false logic
// function should accept both strings and file objects
// include optional value and use object as document holder?
//
// usage: 
// var scriptUIObj = JSUI.getScriptUIStates( { imgFile: "image.png"} );
//
JSUI.getScriptUIStates = function( obj )
{		
	if(obj == undefined) return;
		
	var testImage, imgFileUp, imgFileOver, imgFileDown, disabledImgFile, disabledImgFileOver;
	var imgFileUpExists, imgFileOverExists, imgFileDownExists, disabledImgFileExists, disabledImgFileOver = false;

	var proceed = false;
	if(obj.imgFile != undefined)
	{
		// // if array, assume vector graphics?
		// if(obj.imgFile instanceof Array)
		// {
		// 	// // ScriptUI.newImage (normal, disabled, pressed, rollover);
		// 	// obj.active = ScriptUI.newImage(obj.imgFile, imgFileUp, imgFileDown, imgFileOver);
		// 	// obj.inactive = ScriptUI.newImage(disabledImgFile, disabledImgFile, imgFileDown, disabledImgFileOver);

		// 	// return obj;
		// }

		if(typeof obj.imgFile == "string")
		{
			var imgNameStr = obj.imgFile;
			var containsExtension = imgNameStr.match(/\.[^\\.]+$/) != null;
			var matchesPNGExt = containsExtension ? imgNameStr.match(/\.[^\\.]+$/)[0].toLowerCase() == ".png" : false;

			obj.imgFile = matchesPNGExt ? imgNameStr : imgNameStr + ".png";
		}

		// if not a valid file URI, attempt to make it a file object
		if( !(obj.imgFile instanceof File) )
		{
			testImage = new File(obj.imgFile);

			// if still not valid, add absolute path for parent script
			if(!testImage.exists)
			{
				// get relative path if necessary
				//var matchesDotDotSlash = obj.imgFile.toString().match( /\.\.\//g );

				// this will make it support cases where obj.imgFile parameter is passed as either "/img/file.png", "img/file.png" or just "file.png"
				testImage = new File(JSUI.URI + (obj.imgFile.toString()[0] == "/" ? "" : "/") + obj.imgFile);

				// if not found, test for JSUI.URI + "/img" + name just to make sure
				if(!testImage.exists) 
				{
					testImage = new File(JSUI.URI + "/img" + (obj.imgFile.toString()[0] == "/" ? "" : "/") + obj.imgFile);
				}

				if(testImage.exists)
				{
					obj.imgFile = testImage;
				}
				else
				{
					// placeholder object property
					obj.imgFile = {};
					obj.imgFile.exists = false;
				}
			}
			else
			{
				// placeholder object property
				obj.imgFile = {};
				obj.imgFile.exists = false;
			}
		}

		// find out whether a [imgFile] _up.png/_down.png/_disabled.png/_disabled_up.png is present
		// prepare image file URIs accordingly
		if(obj.imgFile.exists)
		{
			proceed = true;

			imgFileUp = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_up.png"));
			imgFileOver = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_over.png"));
			imgFileDown = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_down.png"));
			
			disabledImgFile = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_disabled.png") );
			disabledImgFileOver = new File(disabledImgFile.toString().replace(/\.(png)$/i, "_over.png"));

			imgFileUpExists = imgFileUp.exists;
			imgFileOverExists = imgFileOver.exists;
			imgFileDownExists = imgFileDown.exists;

			disabledImgFileExists = disabledImgFile.exists;
			disabledImgFileOverExists = disabledImgFileOver.exists;	

			// if background brightness is lower than 40%, look for "_light" prefix
			// we must still support cases where no light version is available, so this step is technically optional
			if(JSUI.backgroundColor[0] > 0.4)
			{
				var suffix = "_light";
				var imgFileNormal = obj.imgFile.toString();

				var imgFileLight = new File(imgFileNormal.replace(/\.(png)$/i, (suffix+".png")));	
				if(imgFileLight.exists)
				{
					obj.imgFile = imgFileLight;
				}	

				var imgFileUpLight = new File(imgFileNormal.replace(/\.(png)$/i, ("_up"+suffix+".png")));
				if(imgFileUpLight.exists)
				{
					imgFileUp = imgFileUpLight;
					imgFileUpExists = true;
				}

				var imgFileOverLight = new File(imgFileNormal.replace(/\.(png)$/i, ("_over"+suffix+".png")));
				if(imgFileOverLight.exists)
				{
					imgFileOver = imgFileOverLight;
					imgFileOverExists = true;
				}

				var imgFileDownLight = new File(imgFileNormal.replace(/\.(png)$/i, ("_down"+suffix+".png")));
				if(imgFileDownLight.exists)
				{
					imgFileDown = imgFileDownLight;
					imgFileDownExists = true;
				}

				var disabledImgFileLight = new File(imgFileNormal.replace(/\.(png)$/i, ("_disabled"+suffix+".png")));
				if(disabledImgFileLight.exists)
				{
					disabledImgFile = disabledImgFileLight;
					disabledImgFileExists = true;
				}

				var disabledImgFileOverLight = new File(imgFileNormal.replace(".png", ("_disabled_over"+suffix+".png")));
				if(disabledImgFileOverLight.exists)
				{
					disabledImgFileOver = disabledImgFileOverLight;
					disabledImgFileOverExists = true;
				}
			}

			if($.level)
			{
				// $.writeln( (obj.imgFile.exists ? "Found: " : "*** NOT FOUND: ") + obj.imgFile.name);
				// $.writeln( (imgFileUpExists ? "Found: " : "***" + imgFileUp.name + " NOT FOUND--instead using ") + (imgFileUpExists ? imgFileUp.name : obj.imgFile.name) );
				// $.writeln( (imgFileOverExists ? "Found: " : "***" + imgFileOver.name + " NOT FOUND--instead using ") + (imgFileOverExists ? imgFileOver.name : obj.imgFile.name) );
				// $.writeln( (imgFileDownExists ? "Found: " : "***" + imgFileDown.name + " NOT FOUND--instead using ") + (imgFileDownExists ? imgFileDown.name : obj.imgFile.name) );				

				// $.writeln( (disabledImgFileExists ? "Found: " : "***" + disabledImgFile.name + " NOT FOUND--instead using ") + (disabledImgFileExists ? disabledImgFile.name : obj.imgFile.name) );
				// $.writeln( (disabledImgFileOverExists ? "Found: " : "***" + disabledImgFileOver.name + " NOT FOUND--instead using ") + (disabledImgFileOverExists ? disabledImgFileOver.name : obj.imgFile.name) );
			}

			// extra sanitization layer
			imgFileUp = imgFileUpExists ? imgFileUp : obj.imgFile;
			imgFileOver = imgFileOverExists ? imgFileOver : obj.imgFile;
			imgFileDown = imgFileDownExists ? imgFileDown : obj.imgFile;

			disabledImgFile = disabledImgFileExists ? disabledImgFile : obj.imgFile;
			disabledImgFileOver = disabledImgFileOverExists ? disabledImgFileOver : obj.imgFile;
		}
	}
	else
	{
		return;
	}

	if(!proceed)
	{
		return null;
	} 
	// ScriptUI.newImage (normal, disabled, pressed, rollover);
	obj.active = ScriptUI.newImage(obj.imgFile, imgFileUp, imgFileDown, imgFileOver);
	obj.inactive = ScriptUI.newImage(disabledImgFile, disabledImgFile, imgFileDown, disabledImgFileOver);

	// these are for CS6 mouseover states
	if(JSUI.isCS6)
	{
		obj.normalState = ScriptUI.newImage( obj.imgFile );
		obj.overState = ScriptUI.newImage( imgFileOver );
		obj.downState = ScriptUI.newImage( imgFileDown );

		obj.normalStateInactive = ScriptUI.newImage( disabledImgFile );
		obj.overStateInactive = ScriptUI.newImage( disabledImgFileOver );
	}
	
	return obj;
};

 
// supercharge object type to store interface element functions
Object.prototype.Components = new Array(); 

// generic close button
Object.prototype.addCloseButton = function( labelStr, nameStr )
{
	var obj = {};
	if(!labelStr) labelStr = "Close";
	
	if(typeof labelStr == "object")
	{
		obj = labelStr;
		if(nameStr) obj.name = nameStr;
	}
	else
	{
		if(!nameStr) obj.name = "ok";
		else obj.name = nameStr;
	}
	if(!obj.label) obj.label = "Close";
	if(!obj.name) obj.name = "ok";
	if(!obj.alignment) obj.alignment =[ "center", "bottom" ];

	// var closeButton = this.addCustomButton( { label: labelStr, name: nameStr, alignment: "center" });

	var closeButton = this.addCustomButton( obj );
	closeButton.alignment = obj.alignment;
	closeButton.preferredSize.width = obj.width ? obj.width : 132;
	closeButton.preferredSize.height = obj.height ? obj.height : 32;

	return closeButton;
};

// Graphics treatment for CS6 (Dialog Window)
Object.prototype.dialogDarkMode = function()
{
	if(JSUI.isPhotoshop && JSUI.isCS6 && JSUI.CS6styling)
	{
		try
		{
			this.graphics.foregroundColor = this.graphics.newPen (this.graphics.PenType.SOLID_COLOR, (JSUI.backgroundColor[0] > 0.4 ? JSUI.dark : JSUI.light), 1);
			this.graphics.backgroundColor = this.graphics.newBrush (this.graphics.PenType.SOLID_COLOR, (JSUI.backgroundColor[0] < 0.4 ? JSUI.foregroundDark : JSUI.backgroundLight), 1); // arbitrary value for edittext components
		}
		catch(e)
		{

		}
	}
};

// Graphics treatment for CS6 
Object.prototype.darkMode = function()
{
	if(JSUI.isPhotoshop && JSUI.isCS6 && JSUI.CS6styling)
	{
		try
		{
			this.graphics.foregroundColor = this.graphics.newPen (this.graphics.PenType.SOLID_COLOR, (JSUI.backgroundColor[0] > 0.4 ? JSUI.dark : JSUI.light), 1);
			this.graphics.backgroundColor = this.graphics.newBrush (this.graphics.PenType.SOLID_COLOR, JSUI.backgroundColor, 1);
		}
		catch(e)
		{

		}
	}
};

// group component	
Object.prototype.addGroup = function(obj)
{
	// if no object available, fallback to simple group	
	if(!obj) return this.add('group');
	
	if(obj.label)	
	{
		this.add('statictext', undefined, obj.label);
	}

	var c = this.add('group');
	c.orientation = obj.orientation ? obj.orientation : 'row';
	c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left';
	
	c.spacing = obj.spacing ? obj.spacing : JSUI.SPACING;

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;

	if(obj.alignment) c.alignment = obj.alignment; 
	if(obj.margins) c.margins = obj.margins;
	
	this.Components[obj.name] = c; 

	return c;
};

Object.prototype.addRow = function(obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addGroup({orientation: 'row'});

	c.alignChildren = obj.alignChildren != undefined ? obj.alignChildren : 'fill';
	c.alignment = obj.alignment != undefined ? obj.alignment : 'top';

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;

	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.margins) c.margins = obj.margins;

	if(obj.helpTip) c.helpTip = obj.helpTip;

	return c;
};

Object.prototype.addColumn = function(obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addGroup({orientation: 'column'});

	c.alignChildren = obj.alignChildren != undefined ? obj.alignChildren : 'fill';
	c.alignment = obj.alignment != undefined ? obj.alignment : 'top';
	
	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.margins) c.margins = obj.margins;

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;

	if(obj.helpTip) c.helpTip = obj.helpTip;

	return c;
};

Object.prototype.addPanel = function(obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.add('panel', undefined, obj.label ? obj.label : '');

	c.orientation = obj.orientation ? obj.orientation : 'column';
	c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left'; 
	c.alignment = obj.alignment != undefined ? obj.alignment : 'top';
	
	if(obj.margins) c.margins = obj.margins;
	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.alignment) c.alignment = obj.alignment;

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	
	this.Components[obj.name] = c; 

	return c;
};

Object.prototype.addTabbedPanel = function(obj)
{
	if(!obj) var obj = {};

	var c = this.add('tabbedpanel');

	if(obj.alignChildren) c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left';

	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.margins) c.margins = obj.margins;
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	return c;
};

Object.prototype.addTab = function(obj)
{
	if(!obj) return;
	var c = this.add("tab");
	c.text = obj.label != undefined ? obj.label : "Default Tab Name";
	c.orientation = obj.orientation ? obj.orientation : 'column';
	if(obj.alignChildren) c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left';

	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.margins) c.margins = obj.margins;

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	return c;
};

Object.prototype.addDivider = function(obj)
{
	if(!obj) var obj = {};
	var c = this.add("panel");
	c.alignChildren = 'fill';
	c.orientation = obj.orientation ? obj.orientation : 'row';

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	return c;
};

Object.prototype.addDividerRow = function()
{
	var c = this.add("panel");
	c.alignChildren = 'fill';
	c.orientation = 'row';

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	return c;
};

Object.prototype.addDividerColumn = function()
{
	var c = this.add("panel");
	c.alignChildren = 'fill';
	c.orientation = 'column';

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	return c;
};

Object.prototype.addCheckBox = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};

	var c = this.add('checkbox', undefined, obj.label ? obj.label : propName, {name: obj.name});
	this.Components[obj.name] = c; 

	c.value = obj.value != undefined ? obj.value : JSUI.PREFS[propName];

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	if(obj.helpTip != undefined) c.helpTip = obj.helpTip;

	c.onClick = function()
	{ 
		JSUI.PREFS[propName] = c.value;
		JSUI.debug(propName + ": " + c.value); 

		if(JSUI.autoSave) JSUI.saveIniFile();
		if(obj.onClickFunction) obj.onClickFunction();
	};

	c.update = function()
	{
		c.value = JSUI.PREFS[propName];
	};

	return c;
};

// //
// 	addToggleIconButton

// 	usage:
// 	- the first parameter must be a string that matches the name of the variable
// 	- if that name matches a property which belongs to the JSUI.PREFS object, this property will be bound to the value of the checkbox/radiobutton
// 	- important: binding will not happen if the variable name does not match the string variable (first param)
// 	- the preset value can otherwise be passed as part of the obj parameter { value: true/false }
// 	- if an array of variable names (strings) is provided, the radiobutton logic will be applied automatically
// 	- images are required (minimum of one per component, full support requires six per component)
// 	- component can be forced to ignore/bypass its own prefs (as in the case of addImageGrid) with obj.createProperty = false
// 	- a local function can be passed 

// 	//
// 	var checkboxImage = container.addToggleIconButton('checkboxImage', { label: "Fallback text (shown if image is not found)", imgFile: "/img/image.png", helpTip: "Checkbox image helptip" });

// 	//
// 	var regularCheckbox = container.addToggleIconButton('regularCheckbox', { label: "Text", helpTip: "Regular checkbox helptip" });
	
// 	//
// 	var radioButtonsArr = ['one', 'two', 'three'];

// 	var one = container.addToggleIconButton('one', { label: "First RadioButton", array: radioButtonsArr, helpTip: "First RadioButton helptip" });
// 	var two = container.addToggleIconButton('two', { label: "Second RadioButton", array: radioButtonsArr, helpTip: "Second RadioButton helptip" });
// 	var three = container.addToggleIconButton('three', { label: "Third RadioButton", array: radioButtonsArr, helpTip: "Third RadioButton helptip" });

// 	//
// 	var radioButtonsArr = ['one', 'two', 'three'];

// 	var one = container.addToggleIconButton('one', { label: "First RadioButton", array: radioButtonsArr, imgFile: "/img/image1.png", helpTip: "First RadioButton helptip" });
// 	var two = container.addToggleIconButton('two', { label: "Second RadioButton", array: radioButtonsArr, imgFile: "/img/image2.png", helpTip: "Second RadioButton helptip" });
// 	var three = container.addToggleIconButton('three', { label: "First RadioButton", array: radioButtonsArr, imgFile: "/img/image3.png", helpTip: "Third RadioButton helptip" });

Object.prototype.addToggleIconButton = function(propName, obj)
{
	// abort if no object provided
	if(obj == undefined) return;

	// obj.createProperty is true by default
	if(obj.createProperty == undefined) obj.createProperty = true;
	
	// component constructor should support valid scriptUIStates
	var scriptUIstates;

	if(obj.imgFile != undefined && obj.imgFile != null)
	{
		scriptUIstates = obj.imgFile.active != undefined ? obj.imgFile : JSUI.getScriptUIStates( obj );
	}
	else
	{
		scriptUIstates = JSUI.getScriptUIStates( obj );
	}

	// in case of problems with image files, fallback to radiobutton/checkbox components
	function _addFallbackComponent( container, propName, obj )
	{
		// if($.level) $.writeln("Fallback: " + (obj.array ? 'radiobutton' : 'checkbox') + "\n");
		var c = (obj.array ? container.addRadioButton(propName, obj) : container.addCheckBox(propName, obj) );

		// if property does not exist, create if asked
		if(JSUI.PREFS[propName] == undefined)
		{
			if(obj.createProperty)
			{
				JSUI.PREFS[propName] = false;
			}
		}
		else
		{	// if property is present but shouldn't, remove it if not welcome.
			if(!obj.createProperty)
			{
				delete JSUI.PREFS[propName];
			}
		}

		if(JSUI.PREFS[propName] != undefined)
		{
			c.value = (typeof JSUI.PREFS[propName] == "boolean" ? JSUI.PREFS[propName] : false);
		}
		return c;
	};
	
	// if image file is found, add iconbutton
	if(obj.imgFile != undefined && obj.imgFile != null)
	{
		if(scriptUIstates != null)
		{
			if(scriptUIstates.active != undefined) // && scriptUIstates.active != null)
			{
				// if($.level) $.writeln("Adding [" + propName + "] toggle iconbutton" + (obj.array ? ' with radiobutton behavior' : '') + "\n");
				var c = this.add('iconbutton', undefined, scriptUIstates.active, {style: "toolbutton" });
				
				// if property does not exist, create if asked
				if(JSUI.PREFS[propName] == undefined)
				{
					if(obj.createProperty)
					{
						JSUI.PREFS[propName] = false;
					}
				}
				else
				{	// if property is present but shouldn't, remove it if not welcome.
					if(!obj.createProperty)
					{
						delete JSUI.PREFS[propName];
					}
				}
		
				if(JSUI.PREFS[propName] != undefined)
				{
					c.value = (typeof JSUI.PREFS[propName] == "boolean" ? JSUI.PREFS[propName] : false);
				}
			}
			else
			{
				var c = _addFallbackComponent( this, propName, obj );
			}
		}
		else
		{
			var c = _addFallbackComponent( this, propName, obj );
		}
	}
	else
	{
		var c = _addFallbackComponent( this, propName, obj );
	}

	if(obj.width != undefined) c.preferredSize.width = obj.width;
	if(obj.height != undefined) c.preferredSize.height = obj.height;

	if(obj.alignment != undefined) c.alignment = obj.alignment;

	if(obj.helpTip != undefined) c.helpTip = obj.helpTip;
	if(obj.disabled != undefined) c.enabled = !obj.disabled;
	
	// manually assign new component to dialog's variable list
	this.Components[propName] = c;

	// add scriptuistates object container
	c.scriptUIstates = scriptUIstates; 

	// fix for unwanted borders and outlines (CS6 & CC+) -- requires onDraw + eventListener
	if(JSUI.isCS6 && c.scriptUIstates != undefined)
	{
		var refImage = c.scriptUIstates.normalState;

		// temporary assignment
		c.image = refImage;
		c.size = refImage.size;

		c.states = {};

		c.states.normalState = c.value ? c.scriptUIstates.normalState : c.scriptUIstates.normalStateInactive;
		c.states.overState = c.value ? c.scriptUIstates.overState : c.scriptUIstates.overStateInactive;
		c.states.downState = c.scriptUIstates.downState;

		c.onDraw = function (state)
		{  
			c.graphics.drawImage(c.image, 0, 0);
			if($.level) $.writeln( propName+".graphics.drawImage() " + c.image ); 
		}  

		// mouse events
		var mouseEventHandler = function(event)
		{
			switch (event.type)
			{  
				case 'mouseover':   
					event.target.image = c.states.overState;  
					break;  
				case 'mouseout':   
					event.target.image = c.states.normalState;  
					break;  
				case 'mousedown':   
					event.target.image = c.states.downState;  
					break;  
				case 'mouseup':   
					event.target.image = c.states.overState;  
					break;  
				default:   
					event.target.image = c.states.normalState;  
			}  
		// target.notify not needed based on this?
		// https://forums.adobe.com/thread/1285844
		//	event.target.notify("onDraw");  
		}  
	
		// event listeners
		c.addEventListener('mouseover', mouseEventHandler, false);  
		c.addEventListener('mouseout', mouseEventHandler, false);  
		c.addEventListener('mousedown', mouseEventHandler, false);  
		c.addEventListener('mouseup', mouseEventHandler, false);  
	}

	// UI callbacks & events

	c.onClick = function()
	{ 
		// if using a set of radiobuttons
		if(obj.array != undefined && this.scriptUIstates != undefined)
		{ 
			//in the case where the initial value of the clicked object is true, skip the whole thing
			var currentValue = JSUI.PREFS[ propName ] != undefined ? JSUI.PREFS[ propName ] : false;
			if(!currentValue)
			{
				for(var i = 0; i < obj.array.length; i++)
				{
					var component = this.Components[ obj.array[i] ];
					var isCurrentComponent = (component == this); 

					if(component != undefined)
					{
						// this doesn't work -- because value is not technically a boolean (1 or 0)
						// component.value = !component.value;

						component.value = isCurrentComponent ? !component.value : false;

						// don't create property if it's not already present.
						if(JSUI.PREFS[ obj.array[i] ] != undefined)
						{
							JSUI.PREFS[ obj.array[i] ] = component.value;
						}
						component.update( );	
					}
				}
			}
		}
		// if image checkbox
		else if( obj.array == undefined && this.scriptUIstates != undefined )
		{
			this.value = !this.value;

			if(JSUI.PREFS[ propName ] != undefined)
			{
				if( JSUI.PREFS[ propName ] != this.value)
				{
					JSUI.PREFS[ propName ] = this.value;
					this.update();
				}
			}
		}
		else if( this.scriptUIstates == undefined )
		{
			// this.value = !this.value;

			// if(JSUI.PREFS[ propName ] != undefined)
			// {
			// 	JSUI.PREFS[ propName ] = this.value;
			// }

			// regular radiobutton
			if(obj.array != undefined)
			{
				for(var i = 0; i < obj.array.length; i++)
				{
					var component = this.Components[ obj.array[i] ];
					var isCurrentComponent = (component == this);
					if(component != undefined)
					{
						if(JSUI.PREFS[ obj.array[i] ] != undefined)
						{
							JSUI.PREFS[ obj.array[i] ] = isCurrentComponent ? this.value : !this.value;
							if($.level) JSUI.debug("\n" + obj.array[i] + ": " + JSUI.PREFS[obj.array[i]]); 
						}
					}
				}
			}
			// regular checkbox
			else
			{
				if(JSUI.PREFS[ propName ] != undefined)
				{
					JSUI.PREFS[ propName ] = this.value;
					// if($.level) JSUI.debug("\n" + propName + ": " + JSUI.PREFS[propName]); 
				}
			}

			// don't update
			// this.update();
			// if($.level) JSUI.debug("\n" + propName + ": " + JSUI.PREFS[propName] + "\n"+propName+".image: " + c.image); 
		}

		// debug display only
		if(obj.array && $.level)
		{
			var str = "";
			for(var i = 0; i < obj.array.length; i++)
			{
				var bool = JSUI.PREFS[ obj.array[i] ];
				str += "  " + obj.array[i] + ": " + (bool ? bool.toString().toUpperCase() : bool);
			}
			if($.level) JSUI.debug((str ? "\n[" + str + " ]" : "") + "\n" + propName + ": " + JSUI.PREFS[propName] + ( this.scriptUIstates != undefined ? ("\n"+propName+".image: " + c.image) : "") ); 
		}

		if(JSUI.autoSave) JSUI.saveIniFile();
		if(obj.onClickFunction) obj.onClickFunction();
	}
	
	// update callback: update the UI based on the true/false value
	c.update = function( scriptUIStatesObj )
	{
		// if not a graphics component, just skip the whole thing
		if(this.scriptUIstates == undefined)
		{
			return;
		}

		if(scriptUIStatesObj == undefined)
		{
			var scriptUIStatesObj = this.scriptUIstates;
		}

		// if($.level) $.writeln(propName + ": Using " + scriptUIStatesObj.active);

		if(JSUI.isCS6)
		{
			// update ScriptUI images used by mouseevents
			this.states.normalState = this.value ? scriptUIStatesObj.normalState : scriptUIStatesObj.normalStateInactive;
			this.states.overState = this.value ? scriptUIStatesObj.overState : scriptUIStatesObj.overStateInactive;
			this.states.downState = scriptUIStatesObj.downState;

			if(this.image != this.states.normalState) this.image = this.states.normalState;
			// JSUI.debug("\n\t" + propName + ".update() " + JSUI.PREFS[propName] + "\n\timage:\t" + this.image + "\n\t\tnormalState:\t" + this.states.normalState + "\n\t\toverState:\t" + this.states.overState + "\n\t\tdownState:\t" + this.states.downState);
		}
		else
		{
			this.image = this.value ? scriptUIStatesObj.active : scriptUIStatesObj.inactive;
			// JSUI.debug("\n\t" + propName + ".update() " + JSUI.PREFS[propName] + "\n\timage:\t" + this.image + "\n\t\tactive:\t" + scriptUIStatesObj.active + "\n\t\tinactive:\t" + scriptUIStatesObj.inactive);
		}
	};

	if(JSUI.PREFS[ propName ] != undefined) c.update();

	return c;
};

// auto-group radiobuttons (self-sufficient)

// var obj = {   propertyNames: ['one', 'two', 'three'], 										// individual property names
//                         labels: ['One.', 'Two...', 'Three!'],
//                         helpTips: ['(Number one)', '(Number two)', '(Number three)'],
// 						createProperties: false, 											// default is true: false will still use values from INI if present
// 																							// typically for keeping individual toggleIconButton values out of the config file because they are used as part of a complex widget (such as addImageGrid)
// 						panel: "Panel Label", 												// creates toggleIcons in a panel container
// 						orientation: "column",												// panel orientation: default is column 
// 						margins: 15,															// default margin value is 15
// 						spacing: 10,														// default spacing value is 10
// 						alignment: "left"

//                         images: ["img/one.png", "img/two.png","img/three.png"],
//                         selection: 0, 														// optional: make sure this does not conflict with JSUI.PREFS object properties 
//                         onClickFunction: function(){ if($.level) $.writeln("Oh HAI! Iz clicked."); }
// 					};
// container.addToggleIconGroup( obj );


Object.prototype.addToggleIconGroup = function( obj )
{
    // abort if no object provided
    if(obj == undefined) return;

    if(obj.propertyNames == undefined) return;

	// if no images provided, include empty strings as a workaround
    if(obj.images == undefined)
	{
		obj.images = [];
		for(var i = 0; i < obj.propertyNames.length; i++)
		{
			obj.images.push("");
		}
	};

    var componentsArray = [];
    var iniPropertiesPresent = false;
    var selectionPresent = obj.selection != undefined;
	// var selectedComponent = null;

    // look for existing properties in config
    var arraySelectionIndex = 0;
    for(var i = 0; i < obj.propertyNames.length; i++)
    {
        if(JSUI.PREFS[obj.propertyNames[i]] != undefined)
        {
            iniPropertiesPresent = true;
        }
        if(JSUI.PREFS[obj.propertyNames[i]])
        {
            arraySelectionIndex = i;
        }
    }

	// if obj.panel is provided, create panel 
	// container is "this" if there is no panel.
	var container = obj.panel ? this.addPanel( { 
		label: obj.panel, 
		orientation: obj.orientation != undefined ? obj.orientation : "column", 
		alignment: obj.alignment != undefined ? obj.alignment : "left", 
		margins: obj.margins != undefined ? obj.margins : 0, 
		spacing: obj.spacing != undefined ? obj.spacing : 0 
		}) : this;
	
	// add text label
	if(obj.label != undefined)
	{
		container.addStaticText( { text: obj.label } );
	}

    for(var i = 0; i < obj.propertyNames.length; i++ )
    {
		// inline declaration fails for some reason...?
        // var iconObj = { 
        //     array: obj.propertyNames,
        //     createProperty: obj.createProperties,
        //     label: obj.labels[i],
        //     helpTip: obj.toolTips[i],
        //     imgFile: obj.images[i],
        //     selection: obj.selection,
        //     onClickFunction: obj.onClickFunction
        // };
        // var toggleButtonObjSpecs = { imgFile: defaultImg, createProperty: obj.createProperties };
        var iconObj = {};
        iconObj.array = obj.propertyNames;
        iconObj.createProperty = obj.createProperties;
        iconObj.label = obj.labels[i];
        iconObj.helpTip = obj.helpTips[i];
		if(obj.images != undefined) iconObj.imgFile = obj.images[i];
        iconObj.selection = arraySelectionIndex != 0 ? arraySelectionIndex : obj.selection;  // iniPropertiesPresent ?
        iconObj.onClickFunction = obj.onClickFunction;

        // var c = this.addToggleIconButton( obj.propertyNames[i], iconObj );
        var c = container.addToggleIconButton( obj.propertyNames[i], iconObj );

        // determine which component will be active by default
        if(iconObj.selection != undefined)
        {
            if(iconObj.selection == i)
            {
                // if using toggleiconbutton (images) c.value is either 0 or 1
                if(iconObj.imgFile != undefined && iconObj.imgFile != "") c.value = 1;
				// otherwise just assume component is a radiobutton
                else c.value = true;

                selectionPresent = true;
				// selectedComponent = c;
            }
        }
        c.update();
        componentsArray.push(c);
        this.Components[obj.propertyNames[i]] = c;
    }

    // if no selection was provided in the creation of the ToggleIconGroup, turn on first component in the list
    // if(obj.array && !selectionPresent)
    if(obj.propertyNames && !selectionPresent)
    {
		// var iconObj = componentsArray[0];
        // if(iconObj.imgFile != undefined && iconObj.imgFile != "") componentsArray[0].value = 1;
        // else componentsArray[0].value = true;
		var comp = this.Components[obj.propertyNames[0]];
        if(comp.imgFile != undefined && comp.imgFile != "") comp.value = 1;
        else comp.value = true;
    }

    // for cases where JSUI.PREFS default object declaration contains presets, use those instead
    // in accordance with the radiobutton logic, the last object that is true has priority over the others

    return componentsArray;
};

// visually update array of controls (typically a group of toggle icon buttons)
JSUI.updateControlsArrayUI = function(targetDialog, controlArr, valuesArr, updatePrefs) 
{
	var updatePrefs = updatePrefs != undefined ? updatePrefs : false;

	if($.level) $.writeln( "updateControlsArrayUI() looping through list of " + controlArr.length + " controls..." );
	for(var i = 0; i < valuesArr.length; i++)
	{
		var propName = controlArr[i];
		var component = targetDialog.Components[ propName ];
		var pref = JSUI.PREFS[propName];

		if(updatePrefs)
		{
			if(pref != undefined)
			{
				if(typeof pref == "boolean")
				{
					JSUI.PREFS[propName] = !pref;
				}
			}
		}

		if($.level) $.writeln( "\t" + propName + "..." );
		if(component != undefined)
		{
		//	component.value = JSUI.PREFS[controlArr[i]];
			component.update();
			if($.level) $.writeln( "\t\t value: "+component.value+"  updated successfully! " );
		}
	}
};

// visually update array of controls (typically a group of toggle icon buttons)
JSUI.turnOffToggleIconButtonsArray = function(targetDialog, controlArr) 
{
	if($.level) $.writeln( "turnOffToggleIconButtonsArray() looping through " + controlArr.length + " controls..." );
	for(var i = 0; i < controlArr.length; i++)
	{
		var component = targetDialog.Components[ controlArr[i] ];
		var propName = controlArr[i];
		if($.level) $.writeln( "\t" + controlArr[i] + "..." );
		if(component != undefined)
		{
			JSUI.PREFS[propName] = false;
			component.value = false;
			component.update();
			if($.level) $.writeln( "\t\t value: "+component.value+"  updated successfully! " );
		}
	}
};

// custom set of components for replacing legacy radiobutton grid
// var propertyName = container.addImageGrid( "propertyName", { strArray: [ "0", "1", "2", "3", "4", "5", "6", "7", "8" ], imgFile: "image.png", rows: 3, columns: 3 } );
Object.prototype.addImageGrid = function(propName, obj)
{
	
	// expected properties
	
	// // array of strings for storing as selection
	// // for example Photoshop knows what the AnchorPosition object is, but Illustrator doesn't
	// obj.strArray = [ 
	// 	AnchorPosition.TOPLEFT,  AnchorPosition.TOPCENTER, AnchorPosition.TOPRIGHT,
	// 	AnchorPosition.MIDDLELEFT,  AnchorPosition.MIDDLECENTER, AnchorPosition.MIDDLERIGHT, 
	// 	AnchorPosition.BOTTOMLEFT,  AnchorPosition.BOTTOMCENTER, AnchorPosition.BOTTOMRIGHT 
	// ];
	
	// // object with active+inactive ScriptUI images)
	// obj.states = JSUI.getScriptUIStates() 
	// // if obj.states.length == strArray.length, assume a grid which uses a different set of ScriptUI images for each component
	

	obj.rows = parseInt(obj.rows);
	obj.columns = parseInt(obj.columns);

	// if no array is provided, create one to work with
	if(obj.strArray == undefined)
	{
		obj.strArray = [];
		// for(var i = 0; i < ( JSUI.PREFS.imageGridColumns * JSUI.PREFS.imageGridRows); i++ )
		for(var i = 0; i < ( obj.columns * obj.rows); i++ )
		{
			obj.strArray.push( i + "" );
		}
	}

	// check if indexes matches before proceeding
	if (obj.rows * obj.columns != obj.strArray.length)
	{
		return;
	}

	// if obj.imgFile has a length, and is NOT a string, assume we're working with an array of ScriptUI state objects
//	var usingMultipleStateObjects = (typeof obj.imgFile != "string" && obj.imgFile.length && obj.imgFile.length == obj.strArray.length);

	//var scriptUIstates = JSUI.getScriptUIStates( { imgFile: obj.imgFile } );

	var jsuiStrArr = [];
	var jsuiComponentArr = [];

	// begin by adding main group
	var grid = this.addColumn( { spacing: 0, margins: 0 } );

	// You've got time!
	// first pass: build array
	for(var row = 0; row < obj.rows; row++)
	{
		for(var item = 0; item < obj.columns; item++)
		{
			var itemName = propName + "Row" + row + "Id" + item;
			jsuiStrArr.push( itemName );
		}
	}

	// second pass: now create actual components and feed them the array
	for(var row = 0; row < obj.rows; row++)
	{
		var r = grid.addRow( { spacing: 0, margins: 0 } );

		for(var item = 0; item < obj.columns; item++)
		{
			var itemName = propName + "Row" + row + "Id" + item;
			// helptip is screwed up!
			var iconbutton = r.addToggleIconButton(itemName, { imgFile: obj.imgFile, array: jsuiStrArr, createProperty: false, helpTip: obj.strArray[ ( row > 0 ? row * obj.columns : 0 ) + item ] });
			jsuiComponentArr.push(iconbutton);

			// override onClick event
			iconbutton.onClick = function()
			{
				for(var i = 0; i < obj.strArray.length; i++)
				{
					// determine if the current array index matches the current component
					var component = jsuiComponentArr[i];
					var isCurrentComponent = (component == this); 

					// update prefs
					if(isCurrentComponent)
					{
						component.value = !component.value;
						JSUI.PREFS[propName] = obj.strArray[i];
					}
					else
					{
						component.value = false;
					}

					// update visual state
					component.update();
				}

				JSUI.debug(propName + ": " + JSUI.PREFS[propName]); 

				if(obj.onClickFunction) obj.onClickFunction();

				if(JSUI.autoSave) JSUI.saveIniFile();
			};
		}
	}

	// update visual state for initial display
	if(JSUI.PREFS[propName] != undefined)
	{
		for(var u = 0; u < obj.strArray.length; u++)
		{
			var isActive = (JSUI.PREFS[propName] == obj.strArray[u]);

			jsuiComponentArr[u].value = isActive ? !jsuiComponentArr[u].value : false;
            jsuiComponentArr[u].update();
		}
	}

	// add string array as component property so it can be accessed from outside
	grid.strArray = obj.strArray;

	// add grid (technically a column layout object) to list of accessible components
	this.Components[propName] = grid;

	//  here's how to match the property value with an index from the internal array if necessary (INI file)
	// 	JSUI.PREFS.propName = JSUI.matchObjectArrayIndex(JSUI.PREFS.propName, this.Components["imageGrid"].strArray, this.Components["imageGrid"].strArray[0]);

};

// get reference point for cropping/resizing
// if Photoshop, returns a valid AnchorPosition enum item
// for other apps, returns 1-9 integer (matches the numerical keypad)
//
//	7	8	9
//	4	5	6
//	1	2	3
//
JSUI.getAnchorReference = function ( str )
{
	// if(str == undefined) return JSUI.isPhotoshop ? AnchorPosition.MIDDLECENTER : 5;
	
	switch(str)
	{
		case 'AnchorPosition.TOPLEFT' : 
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.TOPLEFT : 7;
			break;
		}
		case 'AnchorPosition.TOPCENTER' :
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.TOPCENTER : 8;
			break;
		}
		case 'AnchorPosition.TOPRIGHT' : 
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.TOPRIGHT : 9;
			break;
		}
		case 'AnchorPosition.MIDDLELEFT' : 
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.MIDDLELEFT : 4;
			break;
		}
		case 'AnchorPosition.MIDDLECENTER' : 
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.MIDDLECENTER : 5;
			break;
		}
		case 'AnchorPosition.MIDDLERIGHT' : 
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.MIDDLERIGHT : 6;
			break;
		}
		case 'AnchorPosition.BOTTOMLEFT' : 
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.BOTTOMLEFT : 1;
			break;
		}
		case 'AnchorPosition.BOTTOMCENTER' : 
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.BOTTOMCENTER : 2;
			break;
		}
		case 'AnchorPosition.BOTTOMRIGHT' : 
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.BOTTOMRIGHT : 3;
			break;
		}
		default : // center
		{
			JSUI.anchorRef = JSUI.isPhotoshop ? AnchorPosition.MIDDLECENTER : 5;
			break;
		}
	}
	return JSUI.anchorRef;
};

// this will match a string OR object with an index from an object array (ideally without using an eval() hack)
JSUI.matchObjectArrayIndex = function(value, objArr, defaultValue) 
{
	var newValue = null;
	var isArray = false;

	for(var i = 0; i < objArr.length; i++)
	{
		if(typeof value == 'string')
		{
			if(value == objArr[i].toString())
			{
				newValue = objArr[i];
				break;
			}
		}
		else if(typeof value == 'object')
		{
			// typeof may be object, but let's find out if it's actually an array
			isArray = value.toString().length != value.length; 

			if( (isArray ? value[0].toString() : value.toString()) == objArr[i].toString() )
			{
				newValue = objArr[i];
				break;
			}
		}
	}

	if(newValue == null) newValue = defaultValue;

	return newValue;
};

//  radiobutton component	

// 	var radiobuttons = win.add('group');	
// 	var array = ['rb1', 'rb2', 'rb3'];

// 	var rb1 = radiobuttons.addRadioButton ( 'rb1', { label:'Radiobutton 1', value:prefs.rb1, prefs:prefs, array:['rb1', 'rb2', 'rb3'] } );
// 	var rb2 = radiobuttons.addRadioButton ( 'rb2', { label:'Radiobutton 2', value:prefs.rb2, prefs:prefs, array:['rb1', 'rb2', 'rb3'] } );
// 	var rb3 = radiobuttons.addRadioButton ( 'rb3', { label:'Radiobutton 3', value:prefs.rb3, prefs:prefs, array:['rb1', 'rb2', 'rb3'] } );

Object.prototype.addRadioButton = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	
	var c = this.add('radiobutton', undefined, obj.label ? obj.label : propName);
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	c.value = obj.value != undefined ? obj.value : JSUI.PREFS[propName];
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();
	
	this.Components[propName] = c;

	c.onClick = function()
	{
		JSUI.PREFS[propName] = this.value;

		// if array of radiobutton variables provided, loop through corresponding preferences in object and update accordingly
		if(obj.array)
		{ 
			for(var i = 0; i < obj.array.length; i++)
			{
				// update preference
				JSUI.PREFS[ obj.array[i] ] = (this.Components[obj.array[i]] == c);

				// set radiobutton value (loop automatically sets other radiobuttons to false)
				this.Components[obj.array[i]].value = (this.Components[obj.array[i]] == c); 
				
				if($.level) $.writeln(obj.array[i]+":\t" + this.Components[obj.array[i]].value);
				if(JSUI.autoSave) JSUI.saveIniFile();
			}
		}
		
		if(obj.array && $.level)
		{
			var str = "";
			for(var i = 0; i < obj.array.length; i++)
			{
				var bool = JSUI.PREFS[ obj.array[i] ];
				str += "  " + obj.array[i] + ": " + (bool ? bool.toString().toUpperCase() : bool);
			}
			JSUI.debug(propName + ": " + c.value + (str ? "\n[" + str + " ]" : "")); 
		}

		if(obj.onClickFunction)	obj.onClickFunction();
	}


	// update callback: only updates the UI based on the state of preferences object
	c.update = function()
	{
		c.value = JSUI.PREFS[propName];
	}
	
	return c;
};

// static text component
Object.prototype.addStaticText = function(obj)
{
	// if no object is passed, return a simple vertical spacer
	if(!obj) return this.add('statictext');

	// has label?
	if(obj.label)	
	{
		this.add('statictext', undefined, obj.label);
	}

// some textfield properties (such as multiline) need to be specified at the initial moment of creation
// note that multiline:true is not enough to display a paragraph, the height must also be set accordingly.
	// var c = this.add('statictext', undefined, obj.text ? obj.text : 'Default Text', {multiline: obj.multiline});
	var c = this.add('statictext', undefined, obj.text ? obj.text : '', {multiline: obj.multiline});
	// var c = this.add('statictext', undefined, obj.text != undefined ? obj.text : 'Default Text', {multiline: obj.multiline});
	
	//if(obj.multiline) c.multiline = obj.multiline;
	if(obj.truncate) c.truncate = obj.truncate;
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	//if(obj.alignment) c.alignment = obj.alignment;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	if(obj.justify) c.justify = obj.justify;

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	if(obj.style != undefined && JSUI.isCS6)
	{
		try
		{
			c.graphics.font = obj.style;
		}
		catch(e)
		{
			c.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 14);
		}
	}
	else
	{
		if(JSUI.STYLE != undefined) c.graphics.font = JSUI.STYLE;
	}

	return c;
};

// editable text component
// can be automatically tied to a corresponding UI button to browse folder
//	var edittext = container.addEditText( "edittext", { text:new Folder(prefs.sourcePath).fsName, specs:{browseFile:true}, width:600, label:"Folder:"} );
// (note: if prefsObj has corresponding property, it is updated on the fly by OnChange event)
// 	
Object.prototype.addEditText = function(propName, obj)
{	
	
// 		** bug with file/folder if "~/" ?
// 		auto-characters: value.toString().length
// 		if useGroup, option to insert in existing container? (window/panel/group?)
// 		if label, auto-use group?
	

// Note: To make active work in CC you have to set it in a so-called callback:

// var myText = myWindow.add ("edittext", undefined, "John");
// myText.characters = 30; 

// myWindow.onShow = function ()
// {
// 	myText.active = true; 
// }
		
	
//	var obj = obj != undefined ? obj : {};
	obj.text = obj.text != undefined ? obj.text : (JSUI.PREFS[propName] != undefined ? JSUI.PREFS[propName] : "");
	// var readonly = obj.readonly != undefined ? obj.readonly : false;
	// should also support properties: scrolling/wantReturn/noecho (case-sensitive)

	// setup
	var isFileObject = false;
	var openFile = false;
	var saveFile = false;
	var filter = "*";

	var isFolderObject = false;
	var addIndicator = false;
	var addBrowseButton = false;
	var hasImage = false;
	var imgFile;
	var imgFileExists = false;
	var prefsBypass = false;
	var showUnsavedFileWarning = false; 
	var useGroup = false;
	var wasDynamic = false;

	// let's deal with automatically created objects (group, indicator, label)
	var groupObjectsArray = [];
	
// check for file/folder URI input instructions
	if(obj.specs)
	{
		// open vs save file logic
		isFileObject = obj.specs.browseFile != undefined ? obj.specs.browseFile : false;
		openFile = obj.specs.openFile != undefined ? obj.specs.openFile : true;
		filter = obj.specs.filter != undefined ? obj.specs.filter : "*";

		isFolderObject = obj.specs.browseFolder != undefined ? obj.specs.browseFolder : false;
		addIndicator = obj.specs.addIndicator != undefined ? obj.specs.addIndicator : false;
		addBrowseButton = obj.specs.addBrowseButton != undefined ? obj.specs.addBrowseButton : false;
		useGroup = obj.specs.useGroup != undefined ? obj.specs.useGroup : false;
		hasImage = obj.specs.hasImage != undefined ? obj.specs.hasImage : false;
		prefsBypass = obj.specs.prefsBypass != undefined ? obj.specs.prefsBypass : false;
		showUnsavedFileWarning = obj.specs.showUnsavedFileWarning != undefined ? obj.specs.showUnsavedFileWarning : false;

		if(hasImage && obj.specs.imgFile != undefined)
		{
			imgFile = new File(obj.specs.imgFile);
			imgFileExists = imgFile.exists;
		}		
	}
		
	// create group (optional)
	if(useGroup)
	{
		if(prefsBypass && showUnsavedFileWarning) 
		{
			// if we're told that the active document has not been saved to disk, forced fixed export path (browsewidget toggle button will also be automatically disabled)
			if( JSUI.PREFS[ propName+'UseFixed' ] != undefined)
			{
				wasDynamic = JSUI.PREFS[ propName+'UseFixed' ];
				JSUI.PREFS[ propName+'UseFixed' ] = true;
				wasDynamic = wasDynamic != JSUI.PREFS[ propName+'UseFixed' ];
			}

			var ug = this.addRow( { spacing: obj.specs.groupSpecs.spacing != undefined ? obj.specs.groupSpecs.spacing : 0 } );
			var warningImg = ug.addImage( { imgFile: "/img/warningSign.png" } );
			var warningText = ug.addStaticText( { justify: "left", width: 275, height: 26, multiline: true, alignment: "center", text: "WARNING: Document has not been saved to disk.\nForcing fixed export path mode." } );
			
			warningText.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
			warningText.graphics.foregroundColor = warningText.graphics.newPen (warningText.graphics.PenType.SOLID_COLOR, JSUI.yellow, 1);

			this.Components[propName+'UnsavedWarningGroup'] = ug;
			groupObjectsArray.push( [ug, propName+'UnsavedWarningGroup'] );

			this.Components[propName+'UnsavedWarningImage'] = warningImg;
			groupObjectsArray.push( [warningImg, propName+'UnsavedWarningImage'] );

			this.Components[propName+'UnsavedWarningText'] = warningText;
			groupObjectsArray.push( [warningText, propName+'UnsavedWarningText'] );
		}

		var g = this.add('group');
		// var g = this.addRow( { spacing: obj.specs.groupSpecs.spacing != undefined ? obj.specs.groupSpecs.spacing : 0 } );

		
		if(obj.specs.groupSpecs)
		{
			if(obj.specs.groupSpecs.alignment) g.alignment = obj.specs.groupSpecs.alignment;
			if(obj.specs.groupSpecs.orientation) g.orientation = obj.specs.groupSpecs.orientation;
			//if(obj.specs.groupSpecs.spacing) 
			g.spacing = obj.specs.groupSpecs.spacing != undefined ? obj.specs.groupSpecs.spacing : 0;
		}
		
		this.Components[propName+'Group'] = g;
		groupObjectsArray.push( [g, propName+'Group'] );
	}

	// has label?	
	var l;
	var label = obj.label != undefined ? obj.label : propName;

	if(obj.label != undefined)	
	{
		if(useGroup)
		{
			l = g.add('statictext', undefined, label);
		}
		else
		{
			l = this.add('statictext', undefined, label);
		}
	
		if(JSUI.STYLE) l.graphics.font = JSUI.STYLE;
		groupObjectsArray.push( [l, propName+'Label'] );
	}
	
	// if source/target file/folder needs an 'exists' indication, add read-only checkbox as an indicator next to the edittext component
	if(addIndicator)
	{
		if(useGroup)
		{
			var d = g.add('checkbox', undefined, '');
			// var d = g.add('radiobutton', undefined, '');
		}
		else 
		{
			var d = this.add('checkbox', undefined, '');
			// var d = this.add('radiobutton', undefined, '');
		}

		d.enabled = false;
		d.value = ( isFolderObject ? new Folder(obj.text) : new File(obj.text) ).exists;
		d.helpTip = "URI integrity validator:\nIndicates whether or not specified location exists";
		
		this.Components[propName+'Indicator'] = d;
		groupObjectsArray.push( [d, propName+'Indicator'] );
	}

// some textfield properties (such as multiline) need to be specified at the initial moment of creation
// note that multiline:true is not enough to display a paragraph, the height must also be set accordingly.
	if(useGroup)
	{
		var c = g.add('edittext', undefined, obj.text != undefined ? decodeURI (obj.text) : propName, {
			multiline:obj.multiline ? true : false, 
			readonly: obj.readonly ? true : false,
			enabled: obj.enabled ? true : false
		});
	}
	else 
	{
		var c = this.add('edittext', undefined, obj.text != undefined ? decodeURI (obj.text) : propName, {
			multiline:obj.multiline ? true : false, 
			readonly: obj.readonly ? true : false,
			enabled: obj.enabled ? true : false
		});
	}

	// store previous status to be used as custom dialog onClose()
	if(prefsBypass && showUnsavedFileWarning) 
	{
		c.wasDynamic = wasDynamic;
		c.graphics.font = ScriptUI.newFont(JSUI.isWindows ? "Tahoma" : "Arial", "REGULAR", 10);
	}

	this.Components[propName] = c;
	groupObjectsArray.push( [c, propName] );

	if(JSUI.isCS6 && JSUI.CS6styling) c.dialogDarkMode();
	
	// a pre-configured "Browse..." button can be added
	if(addBrowseButton)
	{
		try
		{
			if(hasImage && imgFileExists)
			{
				var imgFileUp = new File(imgFile.toString().replace(/\.(png)$/i, "_up.png"));
				var imgFileDown = new File(imgFile.toString().replace(/\.(png)$/i, "_down.png"));

				// use PNG as button 
				if(useGroup)
				{
					var b = g.add('iconbutton', undefined, ScriptUI.newImage(imgFile, imgFileUp.exists ? imgFileUp : imgFile, imgFileDown.exists ? imgFileDown : imgFile, imgFile));
				}
				else 
				{
					var b = this.add('iconbutton', undefined, ScriptUI.newImage(imgFile, imgFileUp.exists ? imgFileUp : imgFile, imgFileDown.exists ? imgFileDown : imgFile, imgFile));
				}
			}
			else
			{
				// regular button
				
				if(useGroup)
				{
					var b = g.add('button', undefined, '...', {name:"browse"});
				}
				else 
				{
					var b = this.add('button', undefined, '...', {name:"browse"});
				}
				b.preferredSize.width = 44;

				if(obj.specs.buttonSpecs)
				{
					if(obj.specs.buttonSpecs.width) b.preferredSize.width = obj.specs.buttonSpecs.width;
					if(obj.specs.buttonSpecs.height) b.preferredSize.height = obj.specs.buttonSpecs.height;
				}	
				
			}
	
			b.helpTip = obj.specs.browseFolder ? "Browse for location URI" :  "Browse for file URI";

			
			// preconfigured button callback
			b.onClick = function()
			{
				// if browsing for folder
				if(obj.specs.browseFolder)
				{
					var defaultFolder = c.text;
					var testFolder = new Folder(c.text);
					// if($.level) $.writeln("Browsing for directory. Default path: " + testFolder.fsName);
					if(!testFolder.exists) defaultFolder = "~";

					var chosenFolder = Folder.selectDialog(c.text, defaultFolder);
					
					if(chosenFolder != null)
					{
						// update preferences object
						if(!prefsBypass)
						{
							JSUI.debug("chosenFolder: " + chosenFolder.fsName + "\n[ exists: " + chosenFolder.exists + " ]");
							JSUI.PREFS[propName] = encodeURI (chosenFolder) ;
							c.text = chosenFolder.fsName;
							if(JSUI.autoSave) JSUI.saveIniFile();
						}
						else
						{
							JSUI.debug("Bypassing prefs object property update");
						}
					}
					else
					{
						JSUI.debug("User either closed the browse dialog without chosing a target folder, or pointed to an invalid resource"); 
					}
				}
				// if browsing for file
				if(obj.specs.browseFile)
				{
					var defaultFile = c.text;
					var testFile = new File(c.text);
					// if($.level) $.writeln("Browsing for file to " + (openFile ? "open" : "save over") + ". Default path: " + testFile.parent.fsName);
					if(!testFile.exists) defaultFile = "~";

					if(File.myDefaultSave)
					{
					   Folder.current = File.myDefaultSave;
					}

					// file types
					var chosenFile = openFile ? new File(c.text).openDlg("Select " + ( filter == "*" ? "" : ("." + filter.toUpperCase() ) + " file to open"), ("*." + filter)) : new File(c.text).saveDlg("Select " + ( filter == "*" ? "" : ("." + filter.toUpperCase() ) + " file to save over"), ("*." + filter));

					if(chosenFile)
					{
					   File.myDefaultSave = chosenFile.parent;
					}
					
					if(chosenFile != null)
					{
						JSUI.debug("chosenFile: " + chosenFile.fsName + "\n[ exists: " + chosenFile.exists + " ]");
						JSUI.PREFS[propName] = encodeURI (chosenFile) ;
						c.text = chosenFile.fsName;
						if(JSUI.autoSave) JSUI.saveIniFile();
					}
				}
				// use onChanging callback so "exists" indicator is properly refreshed after selecting file or folder.
				c.onChanging();
			}

			this.Components[propName+'BrowseButton'] = b;
			groupObjectsArray.push( [b, propName+'BrowseButton'] );
			
		}
		catch(e)
		{
			alert(e);
		}

	//
	}

	// Photoshop CS6 does not seem to like this block here

	// if both obj.characters and obj.width are provided, favor obj.width
	if( !isNaN(obj.characters) && !isNaN(obj.width) )
	{
		c.preferredSize.width = obj.width;
	}
	else if( !isNaN(obj.characters) )
	{
		c.characters = obj.characters;
	}
	else if( !isNaN(obj.width) )
	{
		c.preferredSize.width = obj.width;
	}
	else
	{
		c.preferredSize.width = JSUI.DEFAULTEDITTEXTWIDTH;
	}

		// if( !isNaN(obj.characters) )// && (JSUI.isPhotoshop && !JSUI.isCS6)) 
		// {
		// 	c.characters = obj.characters ? obj.characters : JSUI.DEFAULTEDITTEXTCHARLENGTH;
		// }

		// // let's force a default size of 300 for cases where width and characters are both undefined
		// if(obj.width == undefined) // && obj.characters == undefined)
		// {
		// 	c.preferredSize.width = JSUI.DEFAULTEDITTEXTWIDTH;
		// }
		// else
		// {
		// 	c.preferredSize.width = obj.width;
		// }
		//
	//
	//

	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = false;

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();
	
	// filter for File/Folder Object
	if( obj.text != undefined ) 
	{		
		// check for "~/" at the beginning of the string
		// this will ensure that such a path will be translated as fsName even if the target does not exist yet
		
		var userFolder = obj.text.length > 1 && (obj.text[0] == "~" && obj.text[1] == "/") ;
	
		var folder = new Folder(obj.text);
		var file = new File(obj.text);
	
		if(folder.exists)
		{
			c.text = folder.fsName;
		}
		else if(file.exists)
		{
			c.text = file.fsName;
		}
		else
		{
			c.text = decodeURI(obj.text);	
		}
	}
	
	// using the file/folder location dialog automatically triggers onChange()
	// workaround is to refer to onChanging function
	c.onChange = function()
	{
		c.onChanging();

		if(JSUI.autoSave) JSUI.saveIniFile();
	}

	// function that is used when updating textfield
	c.onChanging = function()
	{	
		var folder = new Folder(c.text);
		var file = new File(c.text);
		
		// deal with file/folder existence indicator
		if(isFolderObject || isFileObject)
		{
			var objectExists = (isFolderObject ? new Folder(JSUI.PREFS[propName]) : new File(JSUI.PREFS[propName]) ).exists;

			// check for indicator
			if(addIndicator) this.Components[propName+'Indicator'].value = objectExists;
			
			// update preferences object
			if(!prefsBypass)
			{
				JSUI.PREFS[propName] = encodeURI(JSUI.fsname2uri(c.text));
				JSUI.debug(propName + ": " + c.text + ( "\n[ exists: " + objectExists.toString().toUpperCase() + " ]" )); 
			}
			else
			{
				JSUI.debug("Bypassing prefs object property update");
			}

		}
		else
		{
			// update preferences object
			// validate if string or number is needed
			
			// if the edittext field contains "0x" we are expected to leave as String instead of automatically converting to Number
			if(c.text.trim().match(/0x/i) != null)
			{
				JSUI.PREFS[propName] = encodeURI (c.text.trim());
				JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
			}
			else
			{
				if(!prefsBypass)
				{
					// JSUI.PREFS[propName] = isNaN(c.text) ? encodeURI (c.text) : Number(c.text);
					// empty string allowed!
					JSUI.PREFS[propName] = (c.text == "") ? "" : (isNaN(c.text) ? encodeURI (c.text) : Number(c.text));
					JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
				}
			}
		}
		if(obj.onChangingFunction) obj.onChangingFunction();
	}

	// experimental: provide a way to arbitrarily enable/disable the whole thing from outside
	c.enableStatus = function ( bool )
	{
		for(var i = 0; i < groupObjectsArray.length; i++)
		{
			groupObjectsArray[i][0].enabled = bool;
			if($.level) $.writeln( groupObjectsArray[i][1] + " enabled status: " + bool ); 
		}
	}

	c.enable = function()
	{
		c.enableStatus(true);
	}

	c.disable = function()
	{
		c.enableStatus(false);
	}

	c.update = function()
	{
		c.text = new File( JSUI.PREFS[propName] ).fsName;	
	}

	// if(prefsBypass && showUnsavedFileWarning) 
	// {
	// 	c.onCloseDialog = function()
	// 	{
	// 		if(JSUI.PREFS[ propName+'UseFixed' ] != undefined) JSUI.PREFS[ propName+'UseFixed' ] = c.wasDynamic;
	// 	}
	// }


	return c;
};

// add browse for folder edittext+browsebutton combo
// 	var browseFolder = win.addBrowseForFolder( "browseFolder", { characters: 30} );
Object.prototype.addBrowseForFolder = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addEditText(propName, { text: obj.text != undefined ? obj.text : new Folder(JSUI.PREFS[propName]).fsName, label:obj.label, characters: obj.characters ? obj.characters : 4, width: obj.width ? obj.width : 300, onChangingFunction: obj.onChangingFunction ? obj.onChangingFunction : undefined, specs:{ browseFolder:true, addIndicator:true, addBrowseButton:true, useGroup:true, groupSpecs:{ alignment: obj.alignment != undefined ? obj.alignment : 'right'}} } );

	return c;
};

// add browse for folder edittext+browsebutton combo
// 	var browseFile = win.addBrowseForFile("browseFile", { characters: 40, filter: "png", open: true} ); // open: false for saveDlg
Object.prototype.addBrowseForFile = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addEditText(propName, { label:obj.label, characters: obj.characters ? obj.characters : 45, width: obj.width ? obj.width : 300, onChangingFunction: obj.onChangingFunction ? obj.onChangingFunction : undefined, specs:{ browseFile:true, openFile: obj.openFile != undefined ? obj.openFile : true, filter:obj.filter, addIndicator:true, addBrowseButton:true, useGroup:true, groupSpecs:{ alignment: obj.alignment != undefined ? obj.alignment : 'right', spacing: obj.spacing}, hasImage:false }, } );

	return c;
};

Object.prototype.addBrowseForFileReplace = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addBrowseForFile(propName, { label:obj.label, characters: obj.characters != undefined ? obj.characters : 40, filter: obj.filter, open: false} );
	
	return c;
};


// 	Add Browse for Folder Widget
// 	- manages toggling between fixed folder vs dynamic folder locations
// 	- includes support for optional independant onChanging and onToggle functions

// var browseWidget = container.addBrowseForFolderWidget( "browseWidget", { characters: 50, useFixedOption: true, imgFiles: ["img/createLocation.png", "img/openLocation.png", "img/browseWidgetUseFixed.png" ],  showFixedToggle: true, showUnsavedFileWarning: true, onChangingFunction: browseWidgetChangingFn, onToggleFixedFunction: toggleFixedExportPathFn } );

// JSUI prototyping
Object.prototype.addBrowseForFolderWidget = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	var showUnsavedFileWarning = obj.showUnsavedFileWarning != undefined ? obj.showUnsavedFileWarning : false;

	var c = this.addEditText(propName, { label:obj.label, characters: obj.characters ? obj.characters : 45, onChangingFunction: obj.onChangingFunction ? obj.onChangingFunction : undefined, specs:{ prefsBypass: true, showUnsavedFileWarning: showUnsavedFileWarning, browseFolder:true, addIndicator:false, addBrowseButton:true, useGroup:true, groupSpecs:{ alignment: obj.alignment != undefined ? obj.alignment : 'right'}} } );

	var addIndicator = false;
	var groupObjectsArray = [];

	var useFixedToggleCount = 0;
	var browseWidgetURIupdateCount = 0;
	var browseWidgetFixedURIupdateCount = 0;

    var showFixedOption = obj.showFixedToggle != undefined ? obj.showFixedToggle : false;
	var useFixedOption = obj.useFixedOption != undefined ? obj.useFixedOption : false;
	var showUnsavedFileWarning = obj.showUnsavedFileWarning != undefined ? obj.showUnsavedFileWarning : false;
    var	createLocationImg = JSUI.getScriptUIStates( { imgFile: obj.imgFiles[0] } );
    var	openLocationImg = JSUI.getScriptUIStates( { imgFile: obj.imgFiles[1] } );

    var openOrCreateLocation = this.Components[propName+'Group'].addButton("openOrCreateLocation", {  alignment: "right", imgFile: obj.imgFiles[1], helpTip:"Open this location in file system"} );

    openOrCreateLocation.onClick = function()
    {
		var testPath = new Folder( c.text.trim() );
		var pathMatchesSystem = testPath.toString().match( app.path ) != null;

        if(testPath.exists)
        {
            testPath.execute();
        }
        else if(!testPath.exists)
        {
            testPath.create();
            c.onChanging();
		}
    };

    this.Components[propName+'OpenOrCreateLocation'] = openOrCreateLocation;
    groupObjectsArray.push( [openOrCreateLocation, propName+'OpenOrCreateLocation'] );
    
    if(useFixedOption)
    {
		var toggle = this.Components[propName+'Group'].addToggleIconButton( propName+'UseFixed', { imgFile: ( obj.imgFiles[2] ), alignment: "left", helpTip: "Toggle fixed location mode" });
		
        toggle.onClick = function()
        {
            this.value = !this.value;
			JSUI.PREFS[ propName+'UseFixed' ] = this.value;
			useFixedToggleCount++;
			useFixedChanged = true;
                        
            // when switching from UseFixed to Dynamic, the same value is assigned to both properties. What's up?
            if(JSUI.PREFS[propName+'UseFixed'])
            {
				c.text = new Folder( JSUI.PREFS[propName+"Fixed"] ).fsName;
				var testFolder = new Folder(c.text.trim());

                JSUI.debug(propName+"Fixed: " + JSUI.PREFS[propName+"Fixed"] + " [exists: " + testFolder.exists + "]  useFixedToggleCount: " + useFixedToggleCount);
            }
            else
            {
                c.text = new Folder( JSUI.PREFS[propName] ).fsName;
				var testFolder = new Folder(c.text.trim());
				
                JSUI.debug(propName+": " + JSUI.PREFS[propName] + " [exists: " + testFolder.exists + "]  useFixedToggleCount: " + useFixedToggleCount);
			}

            toggle.update();
			c.onChanging( true );
			
			if(obj.onToggleFixedFunction != undefined) obj.onToggleFixedFunction();

            if(JSUI.autoSave) JSUI.saveIniFile();
        }; 

        // update callback: update the UI based on the true/false value
        toggle.update = function ( scriptUIStatesObj )
        {
            if(scriptUIStatesObj == undefined)
            {
                var scriptUIStatesObj = this.scriptUIstates;
            }

            if(JSUI.isPhotoshop && JSUI.isCS6)
            {
                // update ScriptUI images used by mouseevents
                this.states.normalState = this.value ? scriptUIStatesObj.normalState : scriptUIStatesObj.normalStateInactive;
                this.states.overState = this.value ? scriptUIStatesObj.overState : scriptUIStatesObj.overStateInactive;
                this.states.downState = scriptUIStatesObj.downState;

				if(this.image != this.states.normalState) this.image = this.states.normalState;

				c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, (this.value ? JSUI.dark : JSUI.light), 1);
				c.graphics.backgroundColor = c.graphics.newBrush (c.graphics.PenType.SOLID_COLOR, (this.value ? JSUI.yellow : JSUI.foregroundDark), 1);
            }
            else
            {
                this.image = this.value ? scriptUIStatesObj.active : scriptUIStatesObj.inactive;
            }
		};
					
		this.Components[propName+'UseFixed'] = toggle;
		groupObjectsArray.push( [toggle, propName+'UseFixed'] );

		if(showUnsavedFileWarning)
		{
			toggle.enabled = false;
		}
    }

	// using the file/folder location dialog automatically triggers onChange()
	// workaround is to refer to onChanging function
	c.onChange = function()
	{
		c.onChanging();

		if(JSUI.autoSave) JSUI.saveIniFile();
	}

	// function that is used when updating textfield
	c.onChanging = function( justSwappedBool )
	{	
		// if just swapped, onChanging is called by toggle.onClick()
		var justSwappedBool = justSwappedBool == undefined ? false : justSwappedBool;
		
        var textStr = c.text.trim();
		var testFolderURI = new Folder(textStr);

		var useFixed = JSUI.PREFS[propName+'UseFixed'] != undefined ? JSUI.PREFS[propName+'UseFixed'] : false;

        if(testFolderURI != null && textStr != "")
        {
            if(useFixed)
            {
				// if using fixed and *just* toggled, override prefs value  
				if(justSwappedBool)
				{
					JSUI.PREFS[propName+'Fixed'] = encodeURI(JSUI.fsname2uri(textStr));
					browseWidgetFixedURIupdateCount++;
					c.text = JSUI.uri2fsname( JSUI.PREFS[propName+'Fixed'] );
					testFolderURI = new Folder( c.text );
				}
				// if toggle was NOT just triggered, we're either showing the dialog for the first time or
				else
				{
					// on initialize window...
					if(browseWidgetFixedURIupdateCount == 0)
					{
						c.text = JSUI.uri2fsname( JSUI.PREFS[propName+'Fixed'] );
						testFolderURI = new Folder( c.text );
					}
					// ...or just update prefs object property as expected
					else
					{
						JSUI.PREFS[propName+'Fixed'] = encodeURI(JSUI.fsname2uri(textStr));
						testFolderURI = new Folder( textStr );
					}

					browseWidgetFixedURIupdateCount++;
					
				}

                JSUI.debug( propName +"Fixed: " + JSUI.PREFS[propName+"Fixed"] + " [ exists: " + testFolderURI.exists + " ]  browseWidgetFixedURIupdateCount: " + browseWidgetFixedURIupdateCount);
            }
            else
            {
				if(justSwappedBool)
				{
					JSUI.PREFS[propName] = encodeURI(JSUI.fsname2uri(textStr));
					browseWidgetURIupdateCount++;
					c.text = textStr;
					testFolderURI = new Folder( textStr );
				}
				else
				{
					JSUI.PREFS[propName] = encodeURI(JSUI.fsname2uri(textStr));
					browseWidgetURIupdateCount++;
					testFolderURI = new Folder( textStr );
				}

                JSUI.debug(propName + ": " + JSUI.PREFS[propName] + ( "\n[ exists: " + testFolderURI.exists + " ]  browseWidgetURIupdateCount: " + browseWidgetURIupdateCount) ); 
            }
        }

        // swap button graphics
        if(!testFolderURI.exists)
        {
            openOrCreateLocation.update(createLocationImg);
            openOrCreateLocation.helpTip = "Create directory:\n\n" + testFolderURI.fsName;
        }
        else
        {
            openOrCreateLocation.update(openLocationImg);
            openOrCreateLocation.helpTip = "Open this location in file system:\n\n" + testFolderURI.fsName;
        }

        // check for indicator
        if(addIndicator) this.Components[propName+'Indicator'].value = testFolderURI.exists;

        if(obj.onChangingFunction != undefined) obj.onChangingFunction();
	}
	
	// override browse button behavior
	this.Components[propName+'BrowseButton'].onClick = function()
	{
		var defaultFolder = c.text;
		var testFolder = new Folder(c.text);
		if($.level) $.writeln("Browsing for directory. Default path: " + testFolder.fsName);
		if(!testFolder.exists) defaultFolder = "~";

		var chosenFolder = Folder.selectDialog(c.text, defaultFolder);
		
		if(chosenFolder != null)
		{
			c.text = chosenFolder.fsName;			
		}
		else
		{
			JSUI.debug("User either closed the browse dialog without chosing a target folder, or pointed to an invalid resource"); 
		}

		// use onChanging callback so "exists" indicator is properly refreshed after selecting file or folder.
		c.onChanging();
		if(JSUI.autoSave) JSUI.saveIniFile();
	}
	
    if(showFixedOption)
    {
        if(JSUI.PREFS[ propName+'UseFixed' ] != undefined) toggle.update();
    }

	this.Components[propName] = c;
	groupObjectsArray.push( [c, propName] );

    // running onChanging() event before returning component will initiate "createFolder" button status if relevant
	c.onChanging();
	
	return c;
};


// force integer edittext  (rounds value, 128.12 becomes 128)
// var intNum = container.addNumberInt("intNum", { label: "int" });
//
// optional increment/decrement buttons: 
// var intNum = container.addNumberInt("intNum", { label: "int", controls: true });
Object.prototype.addNumberInt = function(propName, obj)
{
    // to do: force negative or positive?

	var groupObjectsArray = [];

	obj.text = obj.text != undefined ? obj.text : (JSUI.PREFS[propName] != undefined ? JSUI.PREFS[propName] : "");
	obj.readonly = obj.readonly ? true : false;
	obj.controls = obj.controls != undefined ? obj.controls : true; // show increase/decrease controls by default
	// obj.controls = obj.controls ? true : false;
	//obj.decimals = obj.decimals != undefined ? obj.decimals : 0;

	// based on typeof .clamp property
	if(obj.clamp)
	{
		// if neither string nor boolean...
		// { clamp: [0, 255] }
		if( typeof obj.clamp != "string" && typeof obj.clamp != "boolean")
		{
			// ... assume array
			if(obj.clamp.length == 2)
			{
				obj.min = !isNaN(obj.clamp[0]) ? obj.clamp[0] : 0;
				obj.max = !isNaN(obj.clamp[1]) ? obj.clamp[1] : null;
			}
		}
		// boolean clamping logic
		// { clamp: true, min:0, max:255 }
		else if (typeof obj.clamp == "boolean")
		{
			obj.clamp = obj.clamp ? true : false;
			obj.min = !isNaN(obj.min) ? obj.min : 0;
			obj.max = !isNaN(obj.max) ? obj.max : 255;
		}
	}

	// support incrementing/decrementing steps (default value = 1)
	obj.step = !isNaN(obj.step) ? obj.step : 1;

	// add color rectangle logic
	var addRect = obj.hexValue != undefined;
	obj.hexValue = obj.hexValue != undefined ? obj.hexValue : "FFFFFF";

	// force using group
    var g = this.addRow( { spacing: !isNaN(obj.spacing) ? obj.spacing : JSUI.SPACING, alignment: "left" } );

    var label = obj.label != undefined ? obj.label : propName;
    var l = g.add('statictext', undefined, label);
	groupObjectsArray.push( [l, "rect"] );
	if(addRect)
	{
		var rect = g.addRectangle( "rect", { hexValue: obj.hexValue, width: 15, height:10 });
		groupObjectsArray.push( [rect, "rect"] );
	}
    var c = g.add('edittext', undefined, obj.text, { readonly: obj.readonly });

	
	//groupObjectsArray.push( [c, propName] );

	if(obj.controls)
	{
		var dec = g.addButton( { label: "-", width:10, helpTip: "Decrease value by " + obj.step } );
		dec.onClick = function () { c.decrement(); if(obj.onChangingFunction) obj.onChangingFunction(); };
	
		var inc = g.addButton( { label: "+", width:10, helpTip: "Increase value by " + obj.step } );
		inc.onClick = function () { c.increment(); if(obj.onChangingFunction) obj.onChangingFunction(); };	
	}

    if(obj.characters)
    {
        c.characters = obj.characters ? obj.characters : JSUI.DEFAULTEDITTEXTCHARLENGTH;
    }
    else if( !isNaN(obj.width) )
    {
        c.preferredSize.width = obj.width;
    }

    if( !isNaN(obj.height) ) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;

    if(JSUI.isCS6 && JSUI.CS6styling) c.dialogDarkMode();

	// bug with cursor position with default onChanging()...?

    c.onChange = function()
    {
        var str = c.text.trim();
        var num = Number(str);
        num = Math.round(num);

        if(!isNaN(num))
        {
			if(obj.clamp)
			{
				if(num > obj.max) num = obj.max;
				if(num < obj.min) num = obj.min;
			}
			// if( num != Math.round(Number(str)) )
			// {

			// }
            c.text = num;
            JSUI.PREFS[propName] = num;
            JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
    
          //  c.onChanging();
            if(JSUI.autoSave) JSUI.saveIniFile();
            if(obj.onChangingFunction) obj.onChangingFunction();
        }
    };

    c.onChanging = function()
   {
    //    var str = c.text.trim();

        // if(str.match(/0x/i) != null)
        // {
            //JSUI.PREFS[propName] = encodeURI (c.text.trim());
            //JSUI.PREFS[propName] = Number(str);
        //     JSUI.PREFS[propName] = parseInt(str);
        //     JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
        // //}
        if(obj.onChangingFunction) obj.onChangingFunction();
   }; 

//    c.validate = function( num )
//    {
// 		var str = num != undefined ? num : c.text.trim();
// 		var num = parseInt(str);

// 		if(!isNaN(num))
// 		{
// 			if(obj.clamp)
// 			{
// 				if(num > obj.max) num = obj.max;
// 				if(num < obj.min) num = obj.min;
// 			}

// 			//c.text = num;
// 		}
//    }

   c.increment = function()
   {
		var str = c.text.trim();
		var num = obj.decimals != undefined ? Number(str).toFixed( obj.decimals ) : parseInt(str);

		if(!isNaN(num))
		{
			num = Number(num);
			if( !isNaN(obj.decimals) ) num = Number(num.toFixed( obj.decimals ));
			num += obj.step;
		
			if(obj.clamp)
			{
				if(num > obj.max) num = obj.max;
				if(num < obj.min) num = obj.min;
			}

			c.text = !isNaN(obj.decimals) ? num.toFixed( obj.decimals ) : num;
			JSUI.PREFS[propName] = num;
			JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
		}
   };

   c.decrement = function()
   {
		var str = c.text.trim();
		var num = obj.decimals != undefined ? Number(str).toFixed( obj.decimals ) : parseInt(str);

		if(!isNaN(num))
		{
			num = Number(num);
			if( !isNaN(obj.decimals) ) num = Number(num.toFixed( obj.decimals ));
			num -= obj.step;

			if(obj.clamp)
			{
				if(num > obj.max) num = obj.max;
				if(num < obj.min) num = obj.min;
			}
			c.text = !isNaN(obj.decimals) ? num.toFixed( obj.decimals ) : num;
			JSUI.PREFS[propName] = num;
			JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
		}
   };

   	// experimental: provide a way to arbitrarily enable/disable the whole thing from outside
	c.enableStatus = function ( bool )
	{
		for(var i = 0; i < groupObjectsArray.length; i++)
		{
			groupObjectsArray[i][0].enabled = bool;
			if($.level) $.writeln( groupObjectsArray[i][1] + " enabled status: " + bool ); 
		}
	}

   this.Components[propName] = c;

    return c;
};

// force float edittext with fixed decimals (default is 1, 128 changes into 128.0)
// var floatNum = container.addNumberFloat("floatNum", { label: "float", decimals: 4 });
Object.prototype.addNumberFloat = function(propName, obj)
{
    // inherit logic from int edittext component
    var c = this.addNumberInt(propName, obj);
	obj.decimals = !isNaN(obj.decimals) ? obj.decimals : 1;
    
    // override callbacks
    c.onChange = function()
    {
        var str = c.text.trim();
        var num = Number(str);
        var numFloat = num.toFixed( obj.decimals );

        if(!isNaN(num))
        {
            c.text = numFloat; // is this responsible for the cursor position bug?
            // JSUI.PREFS[propName] = c.text; // numFloat
            JSUI.PREFS[propName] = numFloat; // numFloat
            JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 

            if(JSUI.autoSave) JSUI.saveIniFile();
            if(obj.onChangingFunction) obj.onChangingFunction();
        }
    };

    c.onChanging = function()
   {
        // var str = c.text.trim();

        // var num = Number(str);
        // var numFloat = num.toFixed( obj.decimals );

        // if(!isNaN(num))
        // {
        //     JSUI.PREFS[propName] = numFloat;
        //     JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 

             if(obj.onChangingFunction) obj.onChangingFunction();
        // }
   }; 

    // if(!isNaN(obj.decimals))
    // {
        c.text = Number(c.text).toFixed( obj.decimals);
    // }
    return c;
};

// draw rectangle -- propName is superfluous in this case as it does not need to be bound to local settings / INI
// var rect = container.addRectangle( "rect", { hexValue: "FF80FF" size: [ 100, 100 ], helpTip: "Hover for tooltip!" } );
Object.prototype.addRectangle = function(propName, obj)
{	
    var obj = obj != undefined ? obj : {};
    obj.hexValue = obj.hexValue != undefined ? obj.hexValue : "FFFFFF";
	if( obj.strokeWidth != undefined)
	{
		obj.strokeHexValue = obj.strokeHexValue != undefined ? obj.strokeHexValue : "000000";
		obj.strokeWidth = obj.strokeWidth != undefined ? obj.strokeWidth : 0;
		obj.strokeHexValue = obj.strokeHexValue.trim().replace('#', '');
	}
	else obj.strokeWidth = 0;

    obj.textHexValue = obj.textHexValue != undefined ? obj.textHexValue : "000000";

	obj.hexValue = obj.hexValue.trim().replace('#', '');

	obj.textHexValue = obj.textHexValue.trim().replace('#', '');

	var c = this.add('iconbutton', undefined, undefined, {name: propName.toLowerCase(), style: 'toolbutton'});
	this.Components[propName] = c;
	c.size = [ !isNaN(obj.width) ? obj.width : 50, !isNaN(obj.height) ? obj.height : 50 ];

	c.fillBrush = c.graphics.newBrush( c.graphics.BrushType.SOLID_COLOR, JSUI.hexToRGB(obj.hexValue) );
	c.text = obj.text != undefined ? obj.text : "";
	if(c.text) c.textPen = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.hexToRGB(obj.textHexValue), 1);
	c.onDraw = customDraw;

	function customDraw()
	{ 
		with( this )
		{
			graphics.drawOSControl();
			graphics.rectPath( 0+obj.strokeWidth, 0+obj.strokeWidth, size[0]-(obj.strokeWidth*2), size[1]-(obj.strokeWidth*2)); // offset values to include stroke width as part of geometry
			if(obj.strokeHexValue != undefined) graphics.strokePath(graphics.newPen(graphics.PenType.SOLID_COLOR, JSUI.hexToRGB(obj.strokeHexValue), obj.strokeWidth));
			graphics.fillPath( fillBrush );

			if(c.text)
            {
				var strSize = graphics.measureString(text, graphics.font, size[0]);
				var strW = strSize[0]; 
				var strH = strSize[1]; 
                graphics.drawString(
                    text,
                    textPen,
                    (size[0] - strW) / 2,
                    // (size[1] - strH) / 1.75,
                    (size[1] - strH) / 2,
                    graphics.font);
            }
		}
	}

	return c;
}


// var customEllipseBtn2 = container.addEllipse( { width: 100, height: 100, text: "string" });

Object.prototype.addEllipse = function(obj)
{	
    var obj = obj != undefined ? obj : {};
    obj.hexValue = obj.hexValue != undefined ? obj.hexValue : "FFFFFF";
	if( obj.strokeWidth != undefined)
	{
		obj.strokeHexValue = obj.strokeHexValue != undefined ? obj.strokeHexValue : "000000";
		obj.strokeWidth = obj.strokeWidth != undefined ? obj.strokeWidth : 0;
		obj.strokeHexValue = obj.strokeHexValue.trim().replace('#', '');
	}	
	else obj.strokeWidth = 0;

    obj.textHexValue = obj.textHexValue != undefined ? obj.textHexValue : "000000";
	obj.hexValue = obj.hexValue.trim().replace('#', '');
	obj.textHexValue = obj.textHexValue.trim().replace('#', '');

	// var c = this.add('iconbutton', undefined, undefined, {name: propName.toLowerCase(), style: 'toolbutton'});
	var c = this.add('iconbutton', undefined, undefined, { style: 'toolbutton' });
	c.size = [ !isNaN(obj.width) ? obj.width : 50, !isNaN(obj.height) ? obj.height : 50 ];

	c.fillBrush = c.graphics.newBrush( c.graphics.BrushType.SOLID_COLOR, JSUI.hexToRGB(obj.hexValue) );
	c.text = obj.text != undefined ? obj.text : "";
    //  JSUI.hexToRGB() returns array with length of 4, but only first three values are used
	if(c.text) c.textPen = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.hexToRGB(obj.textHexValue), 1); 
	c.onDraw = customDraw;

	function customDraw()
	{ 
		with( this )
		{
			graphics.drawOSControl();
			// graphics.ellipsePath(0, 0, size[0], size[1]); // offset values to include stroke width as part of geometry
            graphics.ellipsePath(0+obj.strokeWidth, 0+obj.strokeWidth, size[0]-(obj.strokeWidth*2), size[1]-(obj.strokeWidth*2)); // offset values to include stroke width as part of geometry
			if(obj.strokeHexValue != undefined) graphics.strokePath(graphics.newPen(graphics.PenType.SOLID_COLOR, JSUI.hexToRGB(obj.strokeHexValue), obj.strokeWidth));
			graphics.fillPath( fillBrush );

            if(c.text)
            {
                var strSize = graphics.measureString(text, graphics.font, size[0]);
				var strW = strSize[0]; 
				var strH = strSize[1]; 
                graphics.drawString(
                    text,
                    textPen,
                    (size[0] - strW) / 2,
                    // (size[1] - strH) / 1.75,
                    (size[1] - strH) / 2,
                    graphics.font);
            }

			// graphics.preferredSize=[200,200];
			// graphics.ellipsePath(2, 80, 100, 100);
			// graphics.strokePath(g.newPen(g.PenType.SOLID_COLOR, [0, 0, 0], 2));
			// graphics.newPath();
		}
	}

	return c;
}

// add image resource based on SVG code
// var graphics = dialog.addVectorGraphics( { shapes: ["77 45 0 0 0 89 77 45"], width: 100, height: 100 });

// IMPORTANT: 
// In this context there is no such thing as rendering a negative shape.
// These can be faked by cutting invisible openings in a main shape,
// or overlapping portions of a same path.

// RGB values are opaque by default
// hex strings can contain 8 characters for specifying opacity
// "#0F67D280"; // "80" = 50% opacity

// simple image, no interaction
Object.prototype.addVectorGraphics = function ( obj )
{
    if(!obj) obj = {};
	if(!obj.shapes) return;
	if(!obj.name) obj.name = "svg-graphics-image";
	obj.simpleImage = true;

	return this.addVectorGraphicsButton( obj );
}

// wrapper for simple vector buttons with text labels
Object.prototype.addVectorGraphicsGroupButton = function ( obj )
{
	if(!obj) obj = {};
	if(!obj.label) obj.label = "ACTION";

	var container = this.addColumn( { alignChildren: "center" });
	var isDarkTheme = true;
	isDarkTheme = JSUI.backgroundColor[0] > 0.5;

	var hexValue = "#00000000"; // 100% transparent background
	var iconHexValue = isDarkTheme ? "#3f3f3f" : "#c6c8c8";
	var iconHexHoverValue = isDarkTheme ? "#46A0F5" : "#1473e6";
	var iconHexDownValue = isDarkTheme ? "#FFFFFF" : "#000000";

	var c = container.addVectorGraphicsButton( { simpleImage: false, imgScale: obj.imgScale, hexValue: hexValue, textHexValue: iconHexValue, hoverValue: iconHexHoverValue, downValue: iconHexDownValue, shapes: obj.shapes, width: obj.width, height: obj.height, onClickFunction: obj.onClickFunction, helpTip: obj.helpTip ? obj.helpTip : obj.label });
	container.addStaticText( { label: obj.label } );
	return c;
}

// clickable url button
Object.prototype.addUrlButton = function ( obj )
{
    if(!obj) obj = {};
	if(!obj.url) return;
	if(!obj.shapes)
	{
		obj.shapes = [ "20.5 23.5 37.5 23.5 37.5 49.5 48.5 49.5 48.5 55.5 18.5 55.5 18.5 49.5 28.5 49.5 28.5 30.5 20.5 30.5 20.5 23.5", "28.5 7.5 33 7.5 37.5 7.5 37.5 12.5 37.5 17.5 33 17.5 28.5 17.5 28.5 12.5 28.5 7.5" ];
		obj.width = 64;
		obj.height = 64;
	}
	if(!obj.name) obj.name = "svg-graphics-url-button";

	if(!obj.hexValue)
	{
		// obj.hexValue = "#00000000"; // transparent background
		obj.hexValue = "#0F67D200";
	}

	if(!obj.textHexValue)
	{
		obj.textHexValue = JSUI.backgroundColor[0] > 0.5 ? "#3f3f3f" : "#c6c8c8";
	}

	if(!obj.hoverValue)
	{
		obj.hoverValue = JSUI.backgroundColor[0] > 0.5 ? "#ffffff80" : "#00000080";
	}

	return this.addVectorGraphicsButton( obj );
}

// addVectorGraphicsButton() UI theme related info depends on JSUI.backgroundColor 
// having been called at least once in current session: JSUI.backgroundColor = JSUI.getBackgroundColor();
// ... can apparently use dlg.graphics.BrushType.THEME_COLOR instead of SOLID_COLOR (?)
//	 Button.graphics.PenType.SOLID_COLOR
Object.prototype.addVectorGraphicsButton = function ( obj )
{
    if(!obj) obj = {};
	if(!obj.shapes) return;
	if(!obj.name) obj.name = "svg-graphics-button";

	// if no width/height provided, use default
	if(!obj.width && !obj.imgWidth) obj.width = 150;
	if(!obj.height && !obj.imgHeight) obj.height = 44;

	// force foreground color based on UI theme
	if(obj.simpleImage)
	{
		if(!obj.hexValue){ obj.hexValue = "#00000000"; } // transparent background
		if(!obj.textHexValue){ obj.textHexValue = JSUI.backgroundColor[0] > 0.5 ? "#3f3f3f" : "#c6c8c8"; }
	}
	// scaling automatically applied to vector graphics coordinates before drawing
	var scale = 1.0;
	if(obj.imgScale) scale = obj.imgScale;
	if(obj.scale) scale = obj.scale;
	
	// "call to action" blue button scheme
	if(!obj.hexValue) obj.hexValue = "#0F67D2"; // "#0F67D280" 50% opacity blue
	if(!obj.textHexValue) obj.textHexValue = "#ffffff";
	if(!obj.hoverValue) obj.hoverValue = "#46A0F5";
	if(!obj.downValue) obj.downValue = "#000000";

	// pre-process color object arrays
	var btnBackgroundRGB = JSUI.hexToRGB(obj.hexValue);
	var btnIconRGB = JSUI.hexToRGB(obj.textHexValue);
	var btnBackgroundHoverRGB = JSUI.hexToRGB(obj.hoverValue);
	var btnIconDownRGB = JSUI.hexToRGB(obj.downValue);

	// must use container as a workaround for updating graphics
    var containerGroup = this.add('group');
	var groupMargins = [0,0,0,0];
	if(obj.imgMargins instanceof Array) groupMargins = obj.imgMargins;
	containerGroup.margins = groupMargins;

    if(obj.alignment) containerGroup.alignment = obj.alignment;
	else containerGroup.alignment = ['fill', 'fill'];
	// else containerGroup.alignment = ['center', 'center'];

	if(obj.alignChildren) containerGroup.alignChildren = obj.alignChildren;
    else containerGroup.alignChildren = ['center', 'center'];

	containerGroup.preferredSize.width = obj.width*scale;
    containerGroup.preferredSize.height = obj.height*scale;

	// { style: "toolbutton" } may be the issue with Windows version onhover
    var c = containerGroup.add('iconbutton', undefined, undefined, { name: obj.name, style: 'toolbutton' });
	c.alignment = obj.alignment ? obj.alignment : ['center', 'center'];

	if(obj.helpTip) c.helpTip = obj.helpTip;

    c.size = [ obj.width*scale, obj.height*scale ];
    c.artSize = [ obj.width*scale, obj.height*scale ];
    c.fillBrush = c.graphics.newBrush( c.graphics.BrushType.SOLID_COLOR, btnBackgroundRGB ); // allows transparency value between 0.0 and 1.0

	// c.text = obj.text != undefined ? obj.text : "";
	// if(c.text)
	// {
	// 	c.textPen = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, btnIconRGB, 1);
	// }
	c.onDraw = _customDraw;

    function _coordsFromSvgPolygons(vecCoord) {
		var points = [];
		var n;
		for (var i = 0; i < vecCoord.length; i++)
		{
			var numbersArr = (typeof vecCoord[i] == "string") ? vecCoord[i].split(/[\s]/) : vecCoord[i].toString().split(",");
			var coords = [];
			var sets = [];
			for (var k = 0; k < numbersArr.length; k += 2)
			{
				sets.push(numbersArr[k] + "," + numbersArr[k + 1]);
			}
			for (var j = 0; j < sets.length; j++)
			{
				n = sets[j].split(",");
				coords[j] = n;
				coords[j][0] = (parseFloat(coords[j][0])*scale);
				coords[j][1] = (parseFloat(coords[j][1])*scale);
			}
			points.push(coords);
		}
		return points;
	}

    function _customDraw()
	{ 
		with( this )
		{
			graphics.drawOSControl();
			graphics.rectPath( 0, 0, size[0], size[1]);
			var fillBrush = this.graphics.newBrush(this.graphics.BrushType.SOLID_COLOR, btnBackgroundRGB);

			graphics.fillPath( fillBrush );
            try {
                for (var i = 0; i < obj.shapes.length; i++)
				{
                    var line = obj.shapes[i];
                    graphics.newPath();
				
					var x = line[0][0];
                    var y = line[0][1];

                    graphics.moveTo(x + (size[0] / 2 - artSize[0] / 2), y + (size[1] / 2 - artSize[1] / 2));

					for (var j = 0; j < line.length; j += 2) {
                        var x = line[j][0];
                        var y = line[j][1];
                        graphics.lineTo(x + (size[0] / 2 - artSize[0] / 2), y + (size[1] / 2 - artSize[1] / 2));
                    }
 					graphics.fillPath( fillBrush );
                    
                }
				// if(!text) if($.level) $.writeln("no text to draw!");
				// if(text)
				// {
				// 	if($.level) $.writeln("drawing string: " + text);
				// 	var strSize = graphics.measureString(text, graphics.font, size[0]);
				// 	var strW = strSize[0]; 
				// 	var strH = strSize[1]; 
				// 	graphics.drawString(
				// 		text,
				// 		textPen,
				// 		(size[0] - strW) / 2,
				// 		// (size[1] - strH) / 1.75,
				// 		(size[1] - strH) / 2,
				// 		graphics.font);
				// }

            } catch (e) {

            }
		}
	}
	
	function _drawVectors()
	{
		this.graphics.drawOSControl();
		this.graphics.rectPath(0, 0, this.size[0], this.size[1]);
		this.graphics.fillPath(this.graphics.newBrush(this.graphics.BrushType.SOLID_COLOR, this.backgroundColor));
		try
		{
			for (var i = 0; i < this.coord.length; i++)
			{
				var line = this.coord[i];
				this.graphics.newPath();
				this.graphics.moveTo(line[0][0] + (this.size[0] / 2 - this.artSize[0] / 2), line[0][1] + (this.size[1] / 2 - this.artSize[1] / 2));
				for (var j = 0; j < line.length; j++)
				{
					this.graphics.lineTo(line[j][0] + (this.size[0] / 2 - this.artSize[0] / 2), line[j][1] + (this.size[1] / 2 - this.artSize[1] / 2));
				}
				this.graphics.fillPath(this.graphics.newBrush(this.graphics.BrushType.SOLID_COLOR, this.iconColor));
			}

			// if(this.iconText)
			// {
			// 	if($.level) $.writeln("drawing string: " + text);
			// 	var strSize = this.graphics.measureString(text, this.graphics.font, size[0]);
			// 	var strW = strSize[0]; 
			// 	var strH = strSize[1]; 
			// 	this.graphics.drawString(
			// 		text,
			// 		this.textPen,
			// 		(size[0] - strW) / 2,
			// 		// (size[1] - strH) / 1.75,
			// 		(size[1] - strH) / 2,
			// 		this.graphics.font);
			// }
		}
		catch (e)
		{

		}
	}

    function _addVectorButton(parentObj, iconVec, size, staticColor, hoverColor, downColor, text) {
		var btn = parentObj.add("button", [0, 0, size[0], size[1], undefined]);

		// sanitize coords once, then reuse
		iconVec = _coordsFromSvgPolygons(iconVec);

		btn.coord = iconVec;
		btn.iconColor = staticColor;
		// btn.iconText = text;
		btn.backgroundColor = btnBackgroundRGB;
		// btn.textPen = btn.graphics.newPen (btn.graphics.PenType.SOLID_COLOR, staticColor, 1);
		btn.artSize = size;
		btn.onDraw = _customDraw;

        if (hoverColor && !obj.simpleImage)
		{
    		try
			{
    			btn.addEventListener("mouseover", function() { _updateVectorButtonOnHover(this, iconVec, hoverColor, btnBackgroundHoverRGB, size); });
    			btn.addEventListener("mouseout", function() { _updateVectorButtonOnHover(this, iconVec, staticColor, btnBackgroundRGB, size); });
    			btn.addEventListener("mousedown", function() { _updateVectorButtonOnHover(this, iconVec, downColor, staticColor, size); });
    		}
    		catch(e)
			{

    		}
        }

		// if(text)
		// {
		// 	if($.level) $.writeln("drawing string: " + text);
		// 	var strSize = btn.graphics.measureString(text, btn.graphics.font, size[0]);
		// 	var strW = strSize[0]; 
		// 	var strH = strSize[1]; 
		// 	btn.graphics.drawString(
		// 		text,
		// 		// btn.iconText,
		// 		btn.textPen,
		// 		(size[0] - strW) / 2,
		// 		// (size[1] - strH) / 1.75,
		// 		(size[1] - strH) / 2,
		// 		btn.graphics.font);
		// }

        // btn.onDraw();
        _updateVectorButtonOnHover(btn, iconVec, staticColor, btnBackgroundRGB, size, text);
		if(obj.helpTip) btn.helpTip = obj.helpTip;
		return btn;
	}

	function _updateVectorButtonOnHover(btn, iconVec, iconColor, backgroundColor, size, text)
	{
		btn.coord = iconVec;
		btn.iconColor = iconColor;
		// btn.iconText = text;
		btn.backgroundColor = backgroundColor;
		btn.artSize = size;
		btn.onDraw = _drawVectors;
		return btn;
	}

    c.updateGraphics = function(container)
    {
		if (container.children.length > 0)
		{
			if(container.children[container.children.length-1] == c)
			{
				container.remove(container.children[container.children.length-1]);
				// if($.level) $.writeln("control refreshed!");

				// replace existing button with updated version
				c = _addVectorButton(container, obj.shapes, [obj.width*scale, obj.height*scale], btnIconRGB, btnIconRGB, btnIconDownRGB, obj.text);
				if(obj.helpTip) c.helpTip = obj.helpTip;
				else if(obj.url) c.helpTip = obj.url;

				c.onClick = function()
				{
					// defined onClickFunction has priority
					if(obj.onClickFunction != undefined)
					{
						obj.onClickFunction();
					}
					else if(obj.url)
					{
						JSUI.launchURL(obj.url);
					}
				}
			}
		}
    }

    c.updateGraphics(containerGroup);

    return c;
}


// "Call to action" button with custom colors
// var obj = { label: "Close", name: "ok", width: 125, height: 35 };
Object.prototype.addCustomButton = function( obj )
{
	if(!obj) var obj = {};

	if(typeof obj == "string")
	{
		var obj = { label: obj };
	}

	if(!obj.width) obj.width = 132;
	if(!obj.height) obj.height = 32;
	if(!obj.label) obj.label = "Close";

	if(obj.hexValue == undefined) obj.hexValue = "#1473e6"; // static
    if(obj.hoverValue == undefined) obj.hoverValue = "#0d66d0";
    if(obj.downValue == undefined) obj.downValue = "#000000";

    if(obj.textHexValue == undefined) obj.textHexValue = "#ffffff";

	if(obj.strokeWidth == undefined) obj.strokeWidth = 0;
	if(obj.strokeHexValue == undefined) obj.strokeHexValue = obj.textHexValue;

	if(obj.roundedCorners == undefined) obj.roundedCorners = true;

	function _drawButton()
	{
		var _width = this.size[0];
		var _height = this.size[1]; // use height as reference diameter
		var _diameter = _height;
		var _radius = _diameter / 2;

		// var _useCircle = false;

		var textColor = JSUI.hexToRGB( obj.textHexValue );
		var buttonColor = JSUI.hexToRGB( obj.hexValue );

		// obj.textHexValue = JSUI.backgroundColor[0] > 0.5 ? "#3f3f3f" : "#c6c8c8";

		this.graphics.drawOSControl();
		// this.graphics.rectPath(0, 0, this.size[0], this.size[1]);
		this.graphics.newPath ();

		if(obj.roundedCorners)
		{
			// draw custom shape 
			// if(_useCircle)
			// {
				// // from https://stackoverflow.com/questions/74929449/scriptui-custom-shape-button-with-ondraw
				// function _halfCircle(
				// 	r, //radius of the half circle
				// 	segStart, //coordinates of the start of the segment
				// 	angleStart, // angle of the start of the segment from the positive x axis
				// 	numSegments //how many segments to draw
				// )
				// {
				// 	var circle = {
				// 		x: function(i, r){ return Math.cos(i) * r},
				// 		y: function(i, r){ return Math.cos(i) * r}
				// 	}

				// 	// var g = this.graphics;
				// 	// this.graphics.newPath();
				// 	this.graphics.moveTo(segStart);

				// 	var increment = Math.pi / numSegments; //Pi in radians is 180°
				// 	var offset = angleStart * Math.pi / 180;

				// 	for (var i = 0; i < numSegments; i++)
				// 	{
				// 		this.graphics.lineTo(
				// 			circle.x(i * increment + offset, r) + segStart, 
				// 			circle.y(i * increment + offset, r) + segStart
				// 		);
				// 	}
				// }
				// // halfCircle(340, [123,456], 123, 45);
				// _halfCircle(_radius, [0, 0], 0, 10);
			// }
			// else
			// {
				this.graphics.moveTo (_radius, 0);
				for (var i = 0; i < Math.PI; i += Math.PI / 100)
				{
					this.graphics.lineTo ((-_radius * Math.sin (i)) + _radius, (-_radius * Math.cos (i)) + _radius);
				}
				this.graphics.lineTo ((_width - _radius), _diameter);
				for (var i = 0; i < Math.PI; i += Math.PI / 100)
				{
					this.graphics.lineTo ((_radius * Math.sin (i)) + (_width - _radius), (_radius * Math.cos (i)) + _radius);
				}
				this.graphics.lineTo (_radius, 0);
			// }

			this.graphics.fillPath(this.fillBrush);

			if (this.text)
			{
				var strSize = this.graphics.measureString(this.text, this.graphics.font, _width);
				var strW = strSize[0]; 
				var strH = strSize[1]; 
				
				// this.graphics.drawString (this.text, (this.graphics.newPen (graphics.PenType.SOLID_COLOR, textColor, 1)), (this.size[0] - this.graphics.measureString (this.text, this.graphics.font, _buttonWidth)[0]) / 2, (_diameter - this.graphics.measureString (this.text, this.graphics.font, _diameter)[1]) / 2, this.graphics.font);
				this.graphics.drawString (this.text, (this.graphics.newPen (this.graphics.PenType.SOLID_COLOR, textColor, 1)), (_width - strW) / 2, (_height - strH) /  1.75, this.graphics.font);
			}
		}
		else
		{
			this.graphics.rectPath(0+obj.strokeWidth, 0+obj.strokeWidth, _width-(obj.strokeWidth*2), _height-(obj.strokeWidth*2));
			// this.graphics.strokePath(this.graphics.newPen(this.graphics.PenType.SOLID_COLOR, [0, 0, 0], strokeWidth)); // black stroke
	
			if(obj.strokeWidth) this.graphics.strokePath(this.graphics.newPen(this.graphics.PenType.SOLID_COLOR, JSUI.hexToRGB(obj.strokeHexValue), obj.strokeWidth));
			this.graphics.fillPath(this.fillBrush);
	
			if (this.text)
			{
		
				var strSize = this.graphics.measureString(this.text, this.graphics.font, _width);
				var strW = strSize[0]; 
				var strH = strSize[1]; 
		
				// this.graphics.drawString(
				// 	this.text,
				// 	this.textPen,
				// 	(_width - strW) / 2,
				// 	(_height - strH) / 1.75,
				// 	this.graphics.font);
	
				this.graphics.drawString (
					this.text, 
					(this.graphics.newPen (this.graphics.PenType.SOLID_COLOR, textColor, 1)), 
					(_width - strW) / 2, 
					(_height - strH) / 1.75, 
					this.graphics.font
					);
	
			}
		
		}
	}
	
	function _updateButton(btn, buttonText, backgroundColor, textColor)
	{
		btn.fillBrush = btn.graphics.newBrush(btn.graphics.BrushType.SOLID_COLOR, JSUI.hexToRGB(backgroundColor));
		btn.text = buttonText;
		btn.textPen = btn.graphics.newPen(btn.graphics.PenType.SOLID_COLOR, JSUI.hexToRGB(textColor), 1);
		btn.graphics.font = ScriptUI.newFont (btn.graphics.font.name, "Bold", btn.graphics.font.size);

		btn.onDraw = _drawButton;
		return btn;
	}

	// this forces "ok" behavior on ALL custom / CTA buttons unless they have an internal name specifically defined
	// var c = this.add('button', undefined, obj.label ? obj.label : "Close", {name: obj.name ? obj.name : "ok"});
	var c = this.add('button', undefined, obj.label ? obj.label : "Close", {name: obj.name ? obj.name : ( obj.label.toLowerCase().replace(/\s/g, "_") ) });

	c.preferredSize.width = obj.width;
	c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;

    if(obj.width) c.preferredSize.width = obj.width;
    if(obj.height) c.preferredSize.height = obj.height;

    c.fillBrush = c.graphics.newBrush(c.graphics.BrushType.SOLID_COLOR, JSUI.hexToRGB(obj.hexValue));
    c.text = obj.label;
    c.textPen = c.graphics.newPen(c.graphics.PenType.SOLID_COLOR, JSUI.hexToRGB(obj.textHexValue), 1);
    c.onDraw = _drawButton;

	try {
		c.addEventListener("mouseover", function(){ _updateButton(this, obj.label, obj.hoverValue, obj.textHexValue); });
		c.addEventListener("mouseout", function(){ _updateButton(this, obj.label, obj.hexValue, obj.textHexValue); });
		c.addEventListener("mouseup", function(){ _updateButton(this, obj.label, obj.hexValue, obj.textHexValue); });
		c.addEventListener("mousedown", function(){ _updateButton(this, obj.label, obj.downValue, obj.textHexValue); });		
	} catch (e) {
	}

	// manually assign new component to dialog's variable list
	// if(obj.name != undefined) this.Components[obj.name] = c;

	if(obj.onClickFunction != undefined)
	{
		c.onClick = function()
		{
			obj.onClickFunction();
			// closing window must be handled explicitely if onClickFunction is defined 
		}
	}
	else if( obj.url != undefined)
	{
		if(typeof obj.url == "string" )
		{
			c.onClick = function ()
			{
				JSUI.launchURL( obj.url );
			}
		}

		// c.updateURL = function( urlStr )
		// {
		// 	c.onClick = function ()
		// 	{
		// 		JSUI.launchURL( urlStr );
		// 	}
		// }
	}

	// draw default state?
	_updateButton(c, obj.label, obj.hexValue, obj.textHexValue);

	return c;
}

// dropdownlist component
// 	var ddlist = container.addDropDownList( "ddlist", { name:"ddlist", list:["Zero", "One", "Two"], label:"Choose a number:"} );
// 
// TODO: - allow for secondary presentation-only array of strings (show value from obj.list, store value from obj.storedList)
// 	var ddlist = container.addDropDownList( "ddlist", { name:"ddlist", list:["Zero", "One", "Two"], label:"Choose a number:"} );
Object.prototype.addDropDownList = function(propName, obj)
{	
	var obj = obj != undefined ? obj : {};
	
	var useGroup = false;
	
	// if dealing with for stored values that are different than the ones shown in UI
	// determine whether to show
	var hasStoredValuesList = false;
	if(obj.storedList)
	{
		if(obj.storedList.length)
		{
			// safeguard: if arrays don't have the same length, just ignore
			hasStoredValuesList = (obj.list.length == obj.storedList.length);
		}
	}

	if(obj.specs)
	{
		//if(obj.specs.useGroup)
		useGroup = obj.specs.useGroup != undefined ? obj.specs.useGroup : false;
	}
	
	// create group (optional)
	if(useGroup)
	{
		var g = this.add('group');
		if(obj.specs.groupSpecs)
		{
			if(obj.specs.groupSpecs.alignChildren) g.alignChildren = obj.specs.groupSpecs.alignChildren;
			if(obj.specs.groupSpecs.alignment) g.alignment = obj.specs.groupSpecs.alignment;
			if(obj.specs.groupSpecs.orientation) g.orientation = obj.specs.groupSpecs.orientation;
			if(obj.specs.groupSpecs.spacing) g.spacing = obj.specs.groupSpecs.spacing;
		}
	}

	// has label?
	if(obj.label)	
	{
		if(useGroup)
		{
			var l = g.add('statictext', undefined, obj.label);
		}
		else
		{
			var l = this.add('statictext', undefined, obj.label);
		}
	
		if(JSUI.STYLE) l.graphics.font = JSUI.STYLE;
	}

	if(useGroup)
	{
		var c = g.add('dropdownlist');
	}
	else 
	{
		var c = this.add('dropdownlist');
	}
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	if(hasStoredValuesList)
	{
		// how to get a valid selection index if storing a string to settings instead of a number
		c.getIndex = function(str)
		{
			var index;
			if(!str) str = JSUI.PREFS[propName];
			for(var i = 0; i < obj.storedList.length; i++)
			{
				if(str == obj.storedList[i]) { index = i; break;}
			}
			return index;
		}
	}

	if(obj.list)
	{ 
		for(var i = 0; i < obj.list.length; i++)
		{
			// c.add("item", hasStoredValuesList ? obj.storedList[i] : obj.list[i] );
			c.add("item", obj.list[i]);
		}

		if(hasStoredValuesList)
		{
			c.selection = c.getIndex(JSUI.PREFS[propName]);
		}
		else
		{
			c.selection = obj.selection != undefined ? obj.selection : JSUI.PREFS[propName];
		}

	}
	
	if(obj.label2)	
	{
		this.add('statictext', undefined, obj.label2);
	}
		
	this.Components[propName] = c;

	// callbacks
	c.onChange = function()
	{
		var currentValue = hasStoredValuesList ? c.getIndex(JSUI.PREFS[propName]) : JSUI.PREFS[propName];
		var changed = false;
		for(var i = 0; i < obj.list.length; i++)
		{
			if(i == parseInt(c.selection))
			{ 
				JSUI.PREFS[propName] = hasStoredValuesList ? obj.storedList[i] : i;
				changed = (currentValue != JSUI.PREFS[propName])
				JSUI.debug(propName + ": [" + c.selection + "]  " + (hasStoredValuesList ? obj.storedList[i] : obj.list[i])); 
				break;
			}
		}
		if(JSUI.autoSave && changed) JSUI.saveIniFile();
		if(obj.onChangedFunction != undefined && changed)
		{
			obj.onChangedFunction();
		}
	}

	c.update = function()
	{
		c.selection = hasStoredValuesList ? c.getIndex(JSUI.PREFS[propName]) : JSUI.PREFS[propName];
	}

	return c;
};

// button component

	// EXAMPLES

	// var button = container.addButton( {label:"Filter Folder Content"} );
	// var iconbutton = container.addButton( { imgFile:new File("/path/to/file.png") } ); // { imgFile: "file.png" } should also work
	// var iconbuttonAlso = container.addButton( "iconbuttonAlso", { } ); // tells JSUI.getScriptUIStates() to look for "iconbuttonAlso.png"
	
	// // couple in context with an edittext component in order to automate file/folder location functions
	// // prefsObj needs a "specs" property (Object), with a direct reference to an existing edittext var name (textfield:varname), 
	// // as well as a String that points to the prefsObj property name (prop:"propertyname")
	// // onClick and onChanging callback functions are automatically assigned, and they take care of updating the prefsObj properties.
	
	// var sourcepath = container.addEditText( { name:"sourcepath", text:new Folder(prefsObj.sourcepath).fsName, prefs:prefsObj } );		
	// var browsebtn = container.addButton( {label:"Browse...", prefs:prefsObj, specs:{ prefs:prefsObj, browseFolder:true, textfield:sourcepath, prop:"sourcepath"} } );

Object.prototype.addButton = function(imgNameStr, obj)
{
	//if(obj == undefined) return;
	if(imgNameStr == undefined) return;

	// if property name not provided, just assume it's the legacy object and proceed
	if(typeof imgNameStr != "string")
	{
		if( typeof imgNameStr == "object")
		{
			obj = imgNameStr;
		}
	}
	// if both arguments are provided and obj.imgFile is not specified, have JSUI.getScriptUIStates() look for "imgNameStr.png"
	else if( typeof imgNameStr == "string" && typeof obj == "object")
	{
		if( obj.imgFile == undefined )
		{
			obj.imgFile = imgNameStr;
		}
	}

	// var scriptUIstates = JSUI.getScriptUIStates( obj );
	// component constructor should support valid scriptUIStates
	var scriptUIstates;
	if(obj.imgFile != undefined && obj.imgFile != null)
	{
		scriptUIstates = obj.imgFile.active != undefined ? obj.imgFile : JSUI.getScriptUIStates( obj );
	}
	else
	{
		// if shapes array provided, delegate to vector graphics button class
		if(obj.shapes)
		{
			if(!obj.hexValue) obj.hexValue = "#00000000"; // default is transparent background
			if(!obj.textHexValue) obj.textHexValue = JSUI.backgroundColor[0] > 0.5 ? "#3f3f3f" : "#c6c8c8";
			if(!obj.hoverValue) obj.hoverValue = "#46A0F5";
			if(!obj.downValue) obj.downValue = JSUI.backgroundColor[0] > 0.5 ? "#ffffff" : "#000000";

			if(!obj.width) obj.width = 48;
			if(!obj.height) obj.height = 48;

			return this.addVectorGraphicsButton( obj );
		}
		scriptUIstates = JSUI.getScriptUIStates( obj );
	}
	
	// if(obj.imgFile != undefined && scriptUIstates.active != undefined)
	// {
	// 	if($.level) $.writeln("Adding iconbutton" + "\n");
	// 	// var c = this.add('iconbutton', undefined, ScriptUI.newImage(obj.imgFile, imgFileUp.exists ? imgFileUp : obj.imgFile, imgFileDown.exists ? imgFileDown : obj.imgFile, imgFileOver.exists ? imgFileOver : obj.imgFile));
	// 	var c = this.add('iconbutton', undefined, scriptUIstates.active, { style: "toolbutton" });
	// }
	// else
	// {
	// 	if($.level) $.writeln("Adding standard text button.");
	// 	scriptUIstates = null;
	// 	var c = this.add('button', undefined, obj.label ? obj.label : "Default Button Text", {name: obj.name});
	// }

	if(scriptUIstates != null)
	{
		if(obj.imgFile.exists)
		{
			if(scriptUIstates.active != undefined)
			{
				// if($.level) $.writeln("Adding iconbutton" + "\n");
				var c = this.add('iconbutton', undefined, scriptUIstates.active, { style: "toolbutton" });
			}
			else
			{
				// if($.level) $.writeln("Adding standard text button.");
				scriptUIstates = null;
				var c = this.add('button', undefined, obj.label ? obj.label : "Default Button Text", {name: obj.name});
			}
		}
		else
		{
			// if($.level) $.writeln("Adding standard text button.");
			scriptUIstates = null;
			var c = this.add('button', undefined, obj.label ? obj.label : "Default Button Text", {name: obj.name});
		}
	}
	else
	{
		// if($.level) $.writeln("Adding standard text button.");
		scriptUIstates = null;
		var c = this.add('button', undefined, obj.label ? obj.label : "Default Button Text", {name: obj.name});
	}


	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	// manually assign new component to dialog's variable list
	if(obj.name != undefined) this.Components[obj.name] = c;

	if(scriptUIstates != null)
	{
		// add scriptuistates object container
		c.scriptUIstates = scriptUIstates; 

		// fix for unwanted borders and outlines (CS6 & CC+) -- requires onDraw + eventListener
		if(JSUI.isCS6)
		{
			var refImage = c.scriptUIstates.normalState;

			// temporary assignment
			c.image = refImage;
			c.size = refImage.size;

			c.states = {};

			// wait. "button" does not have a value property.
			// c.states.normalState = c.value ? c.scriptUIstates.normalState : c.scriptUIstates.normalStateInactive;
			c.states.normalState = c.scriptUIstates.normalState;
			// c.states.overState = c.value ? c.scriptUIstates.overState : c.scriptUIstates.overStateInactive;
			c.states.overState = c.scriptUIstates.overState;
			c.states.downState = c.scriptUIstates.downState;

			c.onDraw = function (state)
			{  
				c.graphics.drawImage(c.image, 0, 0); 
			}  

			// mouse events
			var mouseEventHandler = function(event)
			{
				switch (event.type)
				{  
					case 'mouseover':   
						event.target.image = c.states.overState;  
						break;  
					case 'mouseout':   
						event.target.image = c.states.normalState;  
						break;  
					case 'mousedown':   
						event.target.image = c.states.downState;  
						break;  
					case 'mouseup':   
						event.target.image = c.states.overState;  
						break;  
					default:   
						event.target.image = c.states.normalState;  
				}  
				//event.target.notify("onDraw");  
			}  
		
			// event listeners
			c.addEventListener('mouseover', mouseEventHandler, false);  
			c.addEventListener('mouseout', mouseEventHandler, false);  
			c.addEventListener('mousedown', mouseEventHandler, false);  
			c.addEventListener('mouseup', mouseEventHandler, false);  
		}

		// update callback: update UI state basd on provided scriptUIstates object
		c.update = function( scriptUIStatesObj )
		{
			if(scriptUIStatesObj == undefined)
			{
				var scriptUIStatesObj = this.scriptUIstates;
			}

			// if($.level) $.writeln("Updating jsui button: " + scriptUIStatesObj.active);

			if(JSUI.isCS6)
			{
				// update ScriptUI images used by mouseevents
				this.states.normalState = this.enabled ? scriptUIStatesObj.normalState : scriptUIStatesObj.normalStateInactive;
				this.states.overState = this.enabled ? scriptUIStatesObj.overState : scriptUIStatesObj.overStateInactive;
				this.states.downState = scriptUIStatesObj.downState;

				if(this.image != scriptUIStatesObj.normalState) this.image = scriptUIStatesObj.normalState;
			}
			else
			{
				this.image = this.enabled ? scriptUIStatesObj.active : scriptUIStatesObj.inactive;	
			}
		};

		c.update();
	}

	// if button has "browse" attribute...
	if(obj.specs)
	{
		c.onClick = function()
		{
			// if browsing for folder
			if(obj.specs.browseFolder)
			{
				var defaultFolder = obj.specs.textfield.text;
				var testFolder = new Folder(obj.specs.textfield.text);
				// if($.level) $.writeln("Browsing for output directory. Default path: " + testFolder.fsName);
				if(!testFolder.exists) defaultFolder = "~";

				var chosenFolder = Folder.selectDialog(obj.specs.textfield.text, defaultFolder);
				
				if(chosenFolder != null)
				{
					JSUI.debug("chosenFolder: " + chosenFolder.fsName + " [exists: " + chosenFolder.exists + "]");
					obj.specs.prefs[obj.specs.prop] = chosenFolder;
					obj.specs.textfield.text = chosenFolder.fsName;
				}
			}
			// if browsing for file
			if(obj.specs.browseFile)
			{
				var defaultFile = obj.specs.textfield.text;
				var testFile = new File(obj.specs.textfield.text);
				// if($.level) $.writeln("Browsing for file. Default path: " + testFile.parent.fsName);
				if(!testFile.exists) defaultFile = "~";
		
				if(File.myDefaultSave)
				{
				   Folder.current = File.myDefaultSave;
				}

				var chosenFile = File.saveDialog("Prompt", "*.*"); 
				if(chosenFile)
				{
				   File.myDefaultSave = chosenFile.parent;
				}
				
				if(chosenFile != null)
				{
					JSUI.debug("chosenFile: " + chosenFile.fsName + " [exists: " + chosenFile.exists + "]");
					obj.specs.prefs[obj.specs.prop] = chosenFile;
					obj.specs.textfield.text = chosenFile.fsName;
				}
			}
		}
	}
	else
	{
		// if onClickFunction defined
		if(obj.onClickFunction != undefined)
		// if(obj.onClickFunction)
		{
			c.onClick = function()
			{
				obj.onClickFunction();
			}
		}
		// otherwise if URL available
		else if( obj.url != undefined)
		{
			if(typeof obj.url == "string" )
			{
				c.onClick = function ()
				{
					JSUI.launchURL( obj.url );
				}
			}

			// c.updateURL = function( urlStr )
			// {
			// 	c.onClick = function ()
			// 	{
			// 		JSUI.launchURL( urlStr );
			// 	}
			// }
		}
	}

	return c;
};

// pre-made wrapper for .addButton for launching URL with more info
Object.prototype.addInfoButton = function( obj )
{
	var obj = obj ? obj : {};
	obj.message = obj.message ? obj.message : "Press this button for more detailed information on our wiki.";
	obj.url = obj.url ? obj.url : JSUI.TOOLHELP;
	//obj.imgFile = obj.imgFile ? obj.imgFile : "/img/Info_48px.png";
	if(!obj.label) obj.label = "Info...";
	if(!obj.helpTip) obj.helpTip = "More info:\n\n"+obj.url;

	var c = this.addButton( obj );

	c.onClick = function()
	{
		JSUI.launchURL( obj.url );
	};

	return c;
};

Object.prototype.addImage = function(obj)
{
	// if no object is passed, return as simple image placeholder
	if(obj == undefined)
	{
		var c = this.addRectangle( "rect", { hexValue: 'd0d0d0', strokeWidth: 4, width: 100, height: 100, text: 'image' });
		return c;
	}

	// if obj.shapes provided along with obj.imgWidth && obj.imgHeight, delegate to vector graphics
	if(obj.shapes instanceof Array)
	{
		return this.addVectorGraphics( obj );
	}

	// obj.imgFile may be used to piggyback a custom svg struct
	// detect custom svg object: { 
		// shapes: ['0 0 48 0 48 48 0 48 0 0'], 
		// width: 48,
		// height: 48,
		// label: null,
		// helpTip: null,
		// color: "#ffffff",
		// scale: 1.0
	// }
	if(obj.imgFile)
	{
		var hasSvgShapesArr = (obj.imgFile.shapes instanceof Array);
		hasSvgShapesArr = hasSvgShapesArr ? (typeof obj.imgFile.shapes[0] == 'string') : false;
		var hasSvgWidth = (typeof obj.imgFile.width == 'number');
		var hasSvgHeight = (typeof obj.imgFile.height == 'number');
		// if(obj.imgFile.shapes instanceof Array)
		if(hasSvgShapesArr && hasSvgWidth && hasSvgHeight)
		{
			// imgScale: .scale
			return this.addVectorGraphics( obj.imgFile );
		}
	}

	var scriptUIstates;
	var placeholderStr = "image";

	if((obj.imgFile != undefined) && (obj.imgFile != null))
	{
		if((typeof obj.imgFile) == "string") placeholderStr = obj.imgFile;
		scriptUIstates = obj.imgFile.active != undefined ? obj.imgFile : JSUI.getScriptUIStates( obj );
	}
	else
	{
		scriptUIstates = JSUI.getScriptUIStates( obj );
	}

	if(scriptUIstates != undefined)
	{
		var c = this.add('image', undefined, scriptUIstates.active);
	}
	else
	{	
		// detect svg coords array
		if(obj.imgFile.length && (typeof obj.imgFile[0] == "string"))
		{
			if(obj.imgWidth || obj.imgHeight)
			{
				if(!isNaN(obj.imgWidth)) obj.imgWidth = obj.imgWidth;
				if(!isNaN(obj.imgHeight)) obj.imgHeight = obj.imgHeight;

				if(isNaN(obj.imgWidth)) obj.imgWidth = obj.imgHeight;
				if(isNaN(obj.imgHeight)) obj.imgHeight = obj.imgWidth;
			}

			var c = this.addVectorGraphics( { 
					shapes: obj.imgFile, 
					width: obj.imgWidth, 
					height: obj.imgHeight
				} );
		}
		else
		{
			// label fallback in case image does not exist
			var c = this.addRectangle( "rect", { hexValue: 'd0d0d0', strokeWidth: 4, width: obj.width, height: obj.height, text: placeholderStr });
		}
	}

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;

	// update callback: update the UI based on the true/false value
	// c.update = function( scriptUIStatesObj )
	// {
	// 	if(scriptUIStatesObj == undefined)
	// 	{
	// 		var scriptUIStatesObj = this.scriptUIstates;
	// 	}

	// 	if($.level) $.writeln(propName + ": Using " + scriptUIStatesObj.active);

	// 	if(JSUI.isCS6)
	// 	{
	// 		// update ScriptUI images used by mouseevents
	// 		this.states.normalState = this.value ? scriptUIStatesObj.normalState : scriptUIStatesObj.normalStateInactive;
	// 		this.states.overState = this.value ? scriptUIStatesObj.overState : scriptUIStatesObj.overStateInactive;
	// 		this.states.downState = scriptUIStatesObj.downState;

	// 		if(this.image != this.states.normalState) this.image = this.states.normalState;
	// 	}
	// 	else
	// 	{
	// 		this.image = this.value ? scriptUIStatesObj.active : scriptUIStatesObj.inactive;
	// 	}
	// };
	
	return c;
};

Object.prototype.addIconButton = function(obj)
{
	// if no object is passed, return as simple image placeholder
	if(obj == undefined)
	{
		var c = this.add('iconbutton', undefined, undefined);
		c.preferredSize.width = 100;
		c.preferredSize.height = 100;
		return c;
	}

	// var scriptUIstates = JSUI.getScriptUIStates( obj );
		// component constructor should support valid scriptUIStates
		var scriptUIstates;
		if(obj.imgFile != undefined && obj.imgFile != null)
		{
			scriptUIstates = obj.imgFile.active != undefined ? obj.imgFile : JSUI.getScriptUIStates( obj );
		}
		else
		{
			scriptUIstates = JSUI.getScriptUIStates( obj );
		}
	
	//if(scriptUIstates == undefined) return;

	if(scriptUIstates != undefined)
	{
		var c = this.add('iconbutton', undefined, scriptUIstates.active, {style: "toolbutton"});
	}
	else
	{		
		// fallback in case image does not exist
		var c = this.add('button', undefined, "[Invalid URI: " + obj.imgFile + "]");
	}
	
	// add scriptuistates object container
	c.scriptUIstates = scriptUIstates; 

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	
	// update callback: update the UI based on the true/false value
	c.update = function( scriptUIStatesObj )
	{
		if(scriptUIStatesObj == undefined)
		{
			var scriptUIStatesObj = this.scriptUIstates;
		}

		// if($.level) $.writeln(propName + ": Using " + scriptUIStatesObj.active);

		if(JSUI.isCS6)
		{
			// update ScriptUI images used by mouseevents
			this.states.normalState = this.value ? scriptUIStatesObj.normalState : scriptUIStatesObj.normalStateInactive;
			this.states.overState = this.value ? scriptUIStatesObj.overState : scriptUIStatesObj.overStateInactive;
			this.states.downState = scriptUIStatesObj.downState;

			if(this.image != this.states.normalState) this.image = this.states.normalState;
		}
		else
		{
			this.image = this.value ? scriptUIStatesObj.active : scriptUIStatesObj.inactive;
		}
	};

	return c;
};

// original script by Mehmet Sensoy
// https://forums.creativecow.net/thread/227/37093
//
// var picker =  container.addColorPicker("picker", { label: "Color", value: "FF00dd", width: 64, height: 64, onClickFunction: { alert("Hi from onClick()!") }, helpTip: "Choose color using system color picker"});
Object.prototype.addColorPicker = function(propName, obj)
{
	// add support for text label, grouping, orientation, 

	var obj = obj != undefined ? obj : {};

	var defaultValue = obj.value != undefined ? obj.value.toString() : (JSUI.isPhotoshop ? app.foregroundColor.rgb.hexValue : "FFFFFF");
	var useGroup = obj.useGroup != undefined ? obj.useGroup : true;
	var groupObjectsArray = [];

	if(useGroup)
	{
		var g;

		if(obj.orientation != undefined)
		{
			if(obj.orientation == "column")
			{
				g = this.addColumn( { alignChildren: obj.alignChildren != undefined ? obj.alignChildren : "left" } );
			}
			else
			{
				g = this.addRow( { alignChildren: obj.alignChildren != undefined ? obj.alignChildren : "left" } );
			}
		}
		else
		{
			g = this.addRow( { alignChildren: obj.alignChildren != undefined ? obj.alignChildren : "left" } );
		}

		g.spacing = !isNaN(obj.spacing) ? obj.spacing : JSUI.SPACING;
	}

	var l;
	var label = obj.label != undefined ? obj.label : "";

	if(obj.label != undefined)
	{
		if(useGroup)
		{
			l = g.add('statictext', undefined, label);
		}
		else
		{
			l = this.add('statictext', undefined, label);
		}
	
		groupObjectsArray.push( [l, propName+'Label'] );
	}

	var c = useGroup ? g.add('iconbutton', undefined, undefined, {name:propName, style: 'toolbutton'}) : this.add('iconbutton', undefined, undefined, {name:propName, style: 'toolbutton'});
	c.size = [ obj.width != undefined ? obj.width : 48, obj.height != undefined ? obj.height : 48];
	c.helpTip = obj.helpTip != undefined ? obj.helpTip : "Choose color using system color picker";

	// Photoshop CS6 requires a width, apparently?
	var editTextObj = { characters: 6, text: defaultValue, onChangingFunction: updatePicker, helpTip: "Enter hexadecimal RGB value\n(i.e: FFFFFF)", specs:{ prefsBypass: true } };

	var hexEdittext = useGroup ? g.addEditText(propName+"Text", editTextObj ) : this.addEditText( propName+"Text", editTextObj );
	hexEdittext.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);

	groupObjectsArray.push( [hexEdittext, propName+'Text'] );

	this.Components[propName] = c;
	this.Components[propName+"Text"] = hexEdittext;

	// app-specific color structure rules
	var pickerColor = JSUI.isPhotoshop ? new SolidColor() : new RGBColor();

	// get normalized values (0.0 - 1.0)
	var pickerColorRed = JSUI.HexToR(defaultValue) /255;
	var pickerColorGreen = JSUI.HexToG(defaultValue) /255;
	var pickerColorBlue = JSUI.HexToB(defaultValue) /255;

	if(JSUI.isPhotoshop)
	{
		pickerColor.rgb.hexValue = defaultValue;
	}
	else
	{
		pickerColor.red = JSUI.HexToR(defaultValue) /255;
		pickerColor.green = JSUI.HexToG(defaultValue) /255;
		pickerColor.blue = JSUI.HexToB(defaultValue) /255;
	}

	c.fillBrush = c.graphics.newBrush( c.graphics.BrushType.SOLID_COLOR, [ pickerColorRed, pickerColorGreen, pickerColorBlue, 1] );
	c.text = "";
	c.textPen = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR,[1,1,1], 1);
	c.onDraw = customDraw;

	function customDraw()
	{ 
		with( this )
		{
			graphics.drawOSControl();
			graphics.rectPath( 0, 0, size[0], size[1]);
			graphics.fillPath( fillBrush );
			if( text ) graphics.drawString( text, textPen, (size[0] - graphics.measureString(text, graphics.font, size[0])[0])/2, 3, graphics.font);
		}
	};

	function colorpicker (result_color)
	{
		var color_decimal = $.colorPicker(); // returns integer
		if (color_decimal<0) return null;

		var color_hexadecimal = color_decimal.toString(16);
		var hex = parseInt(color_hexadecimal, 16);
		// var color_rgb = hexToRGB(hex);
		var color_rgb = [hex >> 16,  hex >> 8 & 0xFF,  hex & 0xFF];
		var result_color = [color_rgb[0] / 255, color_rgb[1] / 255, color_rgb[2] / 255]; 
		var hexStr = JSUI.RGBtoHex(color_rgb[0], color_rgb[1], color_rgb[2]);
		// pickerColor.rgb.hexValue = hexStr;
		JSUI.PREFS[propName] = hexStr;

		return result_color;
	};

	// update picker color
	function updatePicker()
	{
		var str = hexEdittext.text.trim();
		
		// if str length is exactly 6 chars
		if(str.length == 6)
		{
			// check for valid hex color string...?

			// get normalized values (0.0 - 1.0)
			var r = JSUI.HexToR(str) /255;
			var g = JSUI.HexToG(str) /255;
			var b = JSUI.HexToB(str) /255;

			try
			{
				c.fillBrush = c.graphics.newBrush(c.graphics.BrushType.SOLID_COLOR, [r, g, b]);
				c.notify("onDraw");

				JSUI.PREFS[propName] = str;
			}
			catch(e)
			{
				if($.level) $.writeln("Error with hexadecimal color string format\n\n" + e);
			}
		}
		else
		{
			if($.level) $.writeln("\tHexColor: Invalid character string");
		}
	};

	c.onClick = function( rgbArr )
	{
		var color = rgbArr != undefined ? rgbArr : colorpicker();
		if (color === null) return;	// dialog dismissed

		this.fillBrush = this.graphics.newBrush(this.graphics.BrushType.SOLID_COLOR, color);
		// no need to call w.update() 
		// no need to reassign onDraw for the button, it's done already
		// call onDraw for the button:
		this.notify("onDraw");

		hexEdittext.text = JSUI.PREFS[propName];
		hexEdittext.onChange(); // this triggers the modification to INI file
		//c.update();
		if(obj.onClickFunction)
		{
		//	alert(selectionArr[0] + "\n" + selectionArr[1]);
			obj.onClickFunction( );
		}
	};

	c.hide = function()
	{
		c.visible = false;
		hexEdittext.visible = false;
	};

	c.show = function()
	{
		c.visible = true;
		hexEdittext.visible = true;
	};

	// update picker component from external call
	c.update = function(hexStr)
	{
		if(hexStr)
		{
			hexEdittext.text = hexStr;
			updatePicker();
		//	alert("updating: " + hexStr)
		}
	}

	return c;
};

// slider component
// var slider = container.addSlider( { name:"slider", prefs:prefsObj, value:prefsObj.slider, minvalue:0, maxvalue:100, width:300, specs: { label:"Quality:", prop:"slider"} } );
Object.prototype.addSlider = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
		
	// has label?
	if(obj.specs && obj.specs.label)	
	{
		this.add('statictext', undefined, obj.specs.label);
	}

	var c = this.add('slider');
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled != undefined) c.enabled = !obj.disabled;
	c.minvalue = obj.minvalue != undefined ? obj.minvalue : 0;
	c.maxvalue = obj.maxvalue != undefined ? obj.maxvalue : 100;
	c.value = obj.value != undefined ? JSUI.clampValue(obj.value, obj.minvalue, obj.maxvalue) : JSUI.clampValue(JSUI.PREFS[propName], obj.minvalue, obj.maxvalue);
	
	this.Components[propName] = c;
	
	var round = false;
	
		var text = this.add('edittext', undefined, obj.value != undefined ? obj.value : JSUI.PREFS[propName]);
		text.characters = obj.specs.characters != undefined ? obj.specs.characters : 6;
		if(JSUI.isCS6 && JSUI.CS6styling) text.darkMode();
		
		this.Components[propName+"Text"] = text;
		
		text.onChanging = function()
		{
			// if last index of currently entered value is a period, don't do anything yet
			var tmpStr = text.text.trim();
			var lastIndex = tmpStr[tmpStr.length-1];
			
			if(lastIndex == "." || (tmpStr.length > 1 && lastIndex == "0") || lastIndex == "-" || tmpStr == "")
			{
				
			}
			else
			{
				var sliderValue = Number(text.text);
				if(sliderValue < obj.minvalue) sliderValue = c.minvalue;
				if(sliderValue > obj.maxvalue) sliderValue = c.maxvalue;
				if(!isNaN(sliderValue))
				{
					c.value = sliderValue;
					text.text = sliderValue;
				}
			}
		}

	c.update = function()
	{
		if(obj.specs)
		{
			// update textfield
			text.text = !isNaN(JSUI.PREFS[propName]) ? JSUI.PREFS[propName] : text.text;
			
			var num = Number(text.text);
			JSUI.PREFS[propName] = num;
			c.value = num;
			JSUI.debug(propName + ": " + num);
		}

	};

	// onChanging a slider might be a bit heavy for CS4+...?
	c.onChange = function()
	{
		JSUI.PREFS[propName] = c.value; 
		if($.level && !obj.specs) JSUI.debug(propName + ": " + JSUI.PREFS[propName]);
		
		c.update();
		if(JSUI.autoSave) JSUI.saveIniFile();
	};

	c.onChanging = function()
	{
		c.update();
	};

	return c;
};

// var listbox = container.addListBox( "listbox", { label:"Listbox Component:", list:["Zero", "One", "Two", "Three"], multiselect:true, width:300, height:100 } );	
Object.prototype.addListBox = function(propName, obj)
{	
	var obj = obj != undefined ? obj : {};
		
	// has label?
	if(obj.label)	
	{
		this.add('statictext', undefined, obj.label);
	}

	var c = this.add('listbox', undefined, obj.list, { multiselect: obj.multiselect != undefined ? obj.multiselect : true});
	this.Components[propName] = c;
		
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	var selection = null;

	// obj.selection has priority if provided, otherwise JSUI.PREFS.propName, or fallback to null
	obj.selection = obj.selection != undefined ? obj.selection : (JSUI.PREFS[propName] != undefined ? JSUI.PREFS[propName] : null );

	switch(typeof obj.selection)
	{
		// undefined or null, leave as is
		case undefined :
		{
			break;
		}
		case null : 
		{
			break;
		}
		
		// if obj.selection is a number, feed it as a single index array
		case "number" :
		{
			selection = [obj.selection];
			break;
		}
		
		// if obj.selection is an object, we're most likely working with an array 
		case "object" :
		{
			if(obj.selection != null)
			{
				if(obj.selection.length != undefined)
				{
					selection = obj.selection;
					break;
				}
				else
				{
					break;
				}
			}
			else
			{
				// object is null
				selection = null;
				break;
			}
		}
		case "string" :
		{
			if(!isNaN(parseInt(obj.selection)))
			{
				selection = parseInt(obj.selection);
			}
			break;
		}
		default :
		{
			break;
		}
	}

	c.selection = selection;
	c.doubleClicked = null;

	// update UI based on current JSUI.PREFS[propName] array
	c.update = function()
	{
		c.selection = JSUI.PREFS[propName] != undefined ? JSUI.PREFS[propName] : null;		
	};

	c._buildArray = function()
	{
		// build new array based on active selection
		var array = [];
		var debugArray = [];
		
		if(c.selection != null)
		{
			for(var sel = 0; sel < c.selection.length; sel++)
			{
				for(var i = 0; i < obj.list.length; i++)
				{
					if(i == c.selection[sel])
					{ 
						array.push(i);
						debugArray.push(c.selection[sel]);
						c.doubleClicked = c.selection[sel];

						break;
					}
				}
			}
		}
		else
		{
			array = null;
		}
		return [array, debugArray];
	};

	c.onChange = function()
	{
		var selectionArr = c._buildArray();
		JSUI.PREFS[propName] = selectionArr[0];
		
		JSUI.debug(propName + " selection: [" + JSUI.PREFS[propName] + "]\n" + ($.level ? selectionArr[1] : [])); 

		if(!obj.disableSaving)
		{
			if(JSUI.autoSave) JSUI.saveIniFile();
		}
	};

	// in case of doubleclick
	c.onDoubleClick = function()
	{
		var selectionArr = c._buildArray();
		JSUI.PREFS[propName] = selectionArr[0];

		JSUI.debug("Doubleclicked item: " + selectionArr[1]); 

		c.doubleClicked = selectionArr[1];

		if(obj.onClickFunction)
		{
			obj.onClickFunction( );
		}
	};

	return c;
};

// progress bar component
Object.prototype.addProgressBar = function(obj)
{		
	// bug: if obj.msg is empty string, doesn't exist at all?
	
	if(obj.label)	
	{
		this.add('statictext', undefined, obj.label);
	}

	var c = this.add('progressbar');
	
	if(obj.msg)	
	{
		c.msg = this.add('statictext', undefined, obj.msg);
		if(obj.msgWidth) c.msg.preferredSize.width = obj.msgWidth;
		c.msg.graphics.font = ScriptUI.newFont(JSUI.isWindows ? "Tahoma" : "Arial", "REGULAR", 10);
	}
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;

	if(obj.minvalue) c.minvalue = obj.minvalue;
	if(obj.maxvalue) c.maxvalue = obj.maxvalue;	
	if(!obj.width && obj.maxvalue < 1000) c.preferredSize.width = obj.maxvalue - obj.minvalue; // use max value if width is not available
	if(obj.value) c.value = obj.value;
	
	c.isDone = false;
	
	this.Components[obj.name] = c;

	c.onCancel = function()
	{
		c.isDone = true;
		return c.isDone;
	};

	// update progress
	c.addProgress = function(num)
	{	
		if(c.value + num < obj.maxvalue ) c.value += num;
		else c.value = c.maxvalue;
		if($.level) $.writeln("...updating progress bar: " + c.value );	
			//win.layout.layout(true);
	};

	// update as percentage?
	c.updateProgress = function(percent)
	{
		c.value = (percent/100) * c.maxvalue; 
		if($.level) $.writeln("Progress: " + Math.round(percent) + " %");	
			//win.layout.layout(true);
		app.refresh();
	};

	// use this when working with JSUI.status object
	c.update = function ( str, debug, refresh )
	{
		c.value = JSUI.status.progress;

		if(obj.msg)
		{
			c.msg.text = str != undefined && str != "" ? str : JSUI.status.message;
		}
		// this will update debugTxt.text
		if(debug) JSUI.debug( "" );

		if(refresh) app.refresh();

	};
	
	if(obj.msg)
	{
		c.updateInfo = function(str)
		{
			if($.level) $.writeln("ProgressBar: " + str);	
			c.msg.text = str;
		}
	}

	return c;
};

// COMBOS

Object.prototype.addDeleteINIButton = function( obj )
{
	var obj = obj != undefined ? obj : {};
	var c = this.addButton( { name:"deleteinifile", label: obj.label != undefined ? obj.label : "[DEL]", helpTip: "Remove current settings file from system" + (JSUI.INIFILE != undefined ? ("\n"+JSUI.INIFILE.fsName) : "" ) } );
			
	c.onClick = function()
	{
		JSUI.deleteIniFile();
	};

	return c;
};

Object.prototype.addOpenINILocationButton = function( obj )
{
	var obj = obj != undefined ? obj : {};
	var c = this.addButton( { name:"openinifilelocation", label: obj.label != undefined ? obj.label : "[OPEN]", helpTip: "Reveal settings file location in " + (JSUI.isWindows ? "Windows Explorer" : "macOS Finder") + "\n" + JSUI.INIFILE.fsName } );
			
	c.onClick = function()
	{
		JSUI.openIniFileLocation();
	};
	
	return c;
};

Object.prototype.addDeleteConfigButton = function( obj )
{
	var obj = obj != undefined ? obj : {};
	var c = this.addButton( { name:"deletecfgfile", label: obj.label != undefined ? obj.label : "[DEL]", helpTip: "Remove current settings file from system" + (JSUI.JSONFILE != undefined ? ("\n"+JSUI.JSONFILE.fsName) : "") } );
			
	c.onClick = function()
	{
		JSUI.deleteConfigFile();
	};

	return c;
};

Object.prototype.addOpenConfigLocationButton = function( obj )
{
	var obj = obj != undefined ? obj : {};
	var c = this.addButton( { name:"opencfgfilelocation", label: obj.label != undefined ? obj.label : "[OPEN]", helpTip: "Reveal settings file location in " + (JSUI.isWindows ? "Windows Explorer" : "macOS Finder")  + (JSUI.JSONFILE != undefined ? ("\n"+JSUI.JSONFILE.fsName) : "") } );
			
	c.onClick = function()
	{
		JSUI.openConfigFileLocation();
	};
	
	return c;
};

// this is used to manually reset the JSUI.PREFS object using a default or custom constructor, with an option to save new settings immediately and allow the user to define a callback function 
// usage: container.addResetConfigButton( new _prefs(), true, function(){ dlg.close(); Main(); })
Object.prototype.addResetConfigButton = function( prefsObj, saveOnResetBool, callbackFunc )
{
	var prefsObj = prefsObj != undefined ? prefsObj : {};
	var c = this.addButton( { name:"resetcfg", label: "Reset", helpTip: "Reset settings to default values" } );
			
	c.onClick = function()
	{
		JSUI.resetPreferences(prefsObj, saveOnResetBool);
		if(callbackFunc != undefined)
		{
			callbackFunc();
		}
	};
	
	return c;
};

// to deprecate eventually
Object.prototype.addSaveSettingsButton = function( obj )
{
	var obj = obj != undefined ? obj : {};
	var c = this.addButton( { name:"saveinifile", label: obj.label != undefined ? obj.label : "Save Settings", imgFile: "/img/SaveSettings.png", helpTip: "Save current settings" } );
			
	c.onClick = function()
	{
		JSUI.saveIniFile();
	};
	
	return c;
};

// create UI components based on object properties
// supported types: string, number, boolean, array and object
// auto-create panel for sub-object properties?
JSUI.componentsFromObject = function (obj, container, array, preferRadiobuttons)
{
	var pushToArray = array != undefined;
	var preferRadiobuttons = preferRadiobuttons != undefined ? preferRadiobuttons : false;
	var props = obj.reflect.properties;

	for(var i in props)
	{
		var property = props[i];
		var value = obj[property];

		// weed out private properties
		var isPrivateProperty = (property.toString().match("_radiobutton_") || property.toString().match("_ddl_selection"));
		
		if(isPrivateProperty || property  == "__proto__" || property == "__count__" || property == "__class__" || property == "reflect" || property == "Components" || property == "typename")
		{
			continue;
		}
		
		if($.level) $.writeln(property + ": " + value);
		
				
		var c;
		
		switch(typeof value)
		{	

			case "number" :
			{			
				if($.level) $.writeln("CREATING EDITTEXT: NUMBER");
				c = container.addEditText(property, {specs:{useGroup:true}});
				if(pushToArray) array.push(c);
				break;
			}
		
			case "string" :
			{
				if($.level) $.writeln("CREATING EDITTEXT: STRING");
				c = container.addEditText(property, {specs:{useGroup:true}});
				if(pushToArray) array.push(c);
				break;
			}
		
			case "boolean" :
			{
				if($.level) $.writeln("CREATING CHECKBOX");
				c = container.addCheckBox(property);
				if(pushToArray) array.push(c);
				break;
			}
		
			// arrays are considered objects
			case "object" :
			{
				// if property has length, treat as array
				if(value.length)
				{
					// use radiobuttons
					if(preferRadiobuttons)
					{
						if($.level) $.writeln("CREATING SET OF RADIOBUTTONS");
						
						for(var i= 0; i < value.length; i++)
						{
							var cName = property + "_radiobutton_" + i;
							
							c = container.addRadioButton(value[i]);

							if(JSUI.isCS6 && JSUI.CS6styling)
							{
								c.darkMode();
							}
													
							// auto-add boolean value to prefs object
							c.value = JSUI.PREFS[cName] != undefined ? JSUI.PREFS[cName] : false;
							
							if(pushToArray) array.push(c);
						}
					}
					// otherwise create dropdownlist
					else
					{
						if($.level) $.writeln("CREATING DROPDOWNLIST");
						
						var cName = property;
						
						c.selection = JSUI.PREFS[cName];
					//	JSUI.PREFS[cName]
						
						c = container.addDropDownList(cName, {list:value});
						if(pushToArray) array.push(c);
					}
				}
				// otherwise treat as object with this same function 
				else
				{
					// warning: objects don't store nicely to INI file
					
					// create new container
					var p = container.addPanel({label:property});
					
					JSUI.componentsFromObject(value, p, array);
				}
				break;
			}
		
			default :
			{
				if($.level) $.writeln("TYPE NOT SUPPORTED");
				break;
			}
		}	
	}

};

// For existing dialog: adds a scrollable list panel
// ideal for listing JSON data quickly

// { 
//     dialog: win,         	// dialog window object
// 	   title: " ",
//     extraInfoArr: undefined,  // optional header info (2D array)
//     columns: undefined,  	// array of column title strings
//     items: itemList,    	 	// array of items to display
//     jsonObjArr: undefined,  	// optional custom json array (one for each row)
//     enabledChunksArr: undefined,  // optional enabled status for individual StaticText objects
// 	   maximumWidth: 800,
// 	   maximumHeight: 400,
// 	   maxCharCount: 60,		// max display string length (ellipsis added if truncated)
// 	   measureStrings: false,	// quick estimate, true: actual ScriptUI measureString()
//	   backgroundColors: undefined	// render black text on #rgb background
// 	   confirmButtonLabel: "Continue",
// 	   confirmButtonHelpTip: "Control description",
// 	   disableConfirmButton: false,	// if dialog window context is already aware that nothing will happen 
// 	   backButton: undefined,	// onClick callback: back button added to top left of dialog (Dismiss button will not be added)

//     onConfirmFunction: function(){}	// invoked when pressing confirm button
// }
// TODO: Scrollbar.jumpdelta: 20% default

JSUI.addScrollableList = function( obj )
{
    if(!obj) obj = {};

    // if(!obj.dialog) return;
    if(!obj.items) return;
    if(!obj.items.length) return;
	if(obj.maxCharCount == undefined) obj.maxCharCount = 60;
	if(obj.measureStr == undefined) obj.measureStr = false;

    // if we don't have a string array for column names, attempt to infer from provided data
    if(!obj.columns)
    {
        // if first item is a JSON-like object
        if( obj.items[0] instanceof Object)
        {
            var tmpArr = obj.items[0].convertToArray();
            obj.columns = tmpArr.map( function(el){ return el[0]; } );
            obj.items = obj.items.map( function(item){ return item.convertToArray(); } );
            obj.items = obj.items.map( function(item){ return item.map( function(it){ return it[1]; }); } );

            if(typeof obj.items[0][0] == "boolean")
            {
                obj.columns[0] = "  ";
            }
        }
        // otherwise if 2D array, map
        else if(obj.items[0] instanceof Array)
        {
            if(obj.items[0].length > 1)
            {
                obj.columns = obj.items.map( function(el){ return el[0] } );
            }
        }
        else return;
    }

    if(!obj.columns) return;

	// Experimental: make panel create its own dialog
	var autoDialog = false;
	if(!obj.dialog)
	{
		obj.dialog = new JSUI.createDialog( { title: obj.title ? obj.title : " ", orientation: "column", margins: [15, 0, 15, 15], spacing: 10, alignChildren: [ "left", "center" ], width: 600, height: 300, debugInfo:false } );
		autoDialog = true;
	}
	
	// parent container
	var container = obj.dialog.addColumn();
	var containerHeader = container.addRow( { margins: [0, 0, 0, 0], alignment: "left"});

	// back button added to dialog header
	// if(obj.backButton)
	if(obj.backButton instanceof Function)
	{
		if(obj.dialog._header) obj.dialog._header.addButton( { label: "<<", name: "back-button", alignment: ["left", "top"], onClickFunction: obj.backButton, helpTip: "Back" });
		else container.addButton( { label: "<<", name: "back-button", alignment: ["left", "top"], onClickFunction: obj.backButton, helpTip: "Back" });
	}

	// arbitrary static info 
	if(obj.extraInfoArr)
	{
		// convert JSON object to array
		if(!(obj.extraInfoArr instanceof Array) && (obj.extraInfoArr instanceof Object))
		{
			obj.extraInfoArr = obj.extraInfoArr.convertToArray();
		}
		obj.extraInfoArr.map(function(infoArr){
			container.addStaticText( { text: infoArr[0] + ": " + decodeURI(infoArr[1]) });
		});
	}

	// show items and misc info
	var statusMsg = container.addStaticText( { text: "Item count: " + obj.items.length, multiline: true, width: 150, alignment: [ "left", "top" ] } );
	statusMsg.enabled = false;

    var itemList = obj.items;
    var headerList = obj.columns;
    
    if(!obj.confirmFunction) obj.confirmFunction = function(){};

    // aligning content with columns require pre-processing strings before they are displayed
	// default behavior: measure width for one average character, then use as reference
	var dummyCharWidth = obj.dialog.graphics.measureString("w", obj.dialog.graphics.font).width;

    var colWidths = [];
    var rowHeight = 20;
    var totalTableWidth = 20;
    var totalTableHeight = 0;

    var defaultColWidth = 20;
    var defaultColSpacing = 10;
	var barW = 20;

	var maxChar = obj.maxCharCount;

    // get list of column widths to work with when creating static text items
    for (var h = 0; h < headerList.length; h++)
    {
        // default width
        var colWidth = defaultColWidth;
		var hStrWidth = colWidth;
		var largest = hStrWidth;
        // measure each column header string
        if(headerList[h] != undefined)
        {
            var hStrWidth = obj.measureStrings ? obj.dialog.graphics.measureString(headerList[h], obj.dialog.graphics.font).width : (headerList[h].length * dummyCharWidth);
            if(hStrWidth < defaultColWidth) hStrWidth = defaultColWidth;
        }

        for (var i = 0; i < itemList.length; i++)
        {    
            if(i == 0) totalTableHeight += rowHeight;

            var itemWidth = colWidth;
            var item = itemList[i][h];
			if(item == undefined) 
			{
				strWidth = colWidth;
				continue;
			}

            if((typeof item == "number")) item = item.toString();
            if(typeof item == "string")
            {
				var strLength = item.length;
                var strWidth = obj.measureStrings ? obj.dialog.graphics.measureString(strLength < maxChar ? item : item.substr(0, maxChar-2) + "...", obj.dialog.graphics.font).width : ((strLength < maxChar ? item : item.substr(0, maxChar-2) + "...").length * dummyCharWidth);
                if(strWidth > itemWidth) colWidth = strWidth;
                if(hStrWidth > colWidth) colWidth = hStrWidth;
				
            }
			if(colWidth > largest) largest = colWidth;
        }
        colWidths.push(colWidth);
        totalTableWidth += colWidth;
    }

    var rows = [];
    var headerRow = container.addRow( { margins: [15, 0, 0, 0], alignment: "left"});

    for (var h = 0; h < headerList.length; h++)
    {
        var headerText = headerRow.add("statictext", undefined, headerList[h]);
        headerText.preferredSize.width = colWidths[h] + defaultColSpacing;
    }

    var c = container.addPanel( { label: "", alignChildren: "fill", alignment: "fill" });

	c.preferredSize.width = 700;
	c.preferredSize.height = totalTableHeight > 500 ? 500 : 200;

    c.minimumSize.width = 700;
    c.minimumSize.height = 200;

	c.maximumSize.width = 1000;
	c.maximumSize.height = 600;

	if(!isNaN(obj.maximumWidth))
	{
		c.maximumSize.width = obj.maximumWidth;
	}

	if(!isNaN(obj.maximumHeight))
	{
		c.maximumSize.height = obj.maximumHeight;
	}
	
    var col = c.addColumn( { alignChildren: "fill", alignment: "fill" });
    col.maximumSize.height = itemList.length*100;

	var jsonArrMatchesItemsLength = false;
	if(obj.jsonObjArr) jsonArrMatchesItemsLength = itemList.length == obj.jsonObjArr.length;

	var enabledChunksArrMatchesItemsLength = false;
	if(obj.enabledChunksArr) enabledChunksArrMatchesItemsLength = itemList.length == obj.enabledChunksArr.length;
	
    // add individual rows
    for (var i = 0; i < itemList.length; i++)
    {
        var row = col.addRow( { alignChildren: "left", alignment: "left" });

        for (var j = 0; j < itemList[i].length; j++)
        {
            // if first item in row is a boolean, interpret as dynamic checkbox
            if(j == 0 && (typeof itemList[i][j]) == "boolean")
            {
				var cbValue = itemList[i][j];
				var cb = row.addCheckBox( "checkb"+i, { label: " ", value: cbValue });
                row._checkbox = cb;
				row._initialCheckboxValue = cbValue;

				// store custom JSON object if provided
				if(jsonArrMatchesItemsLength) row._jsonObj = obj.jsonObjArr[i];

				// override default callbacks
                row._checkbox.onClick = function(){};
                row._checkbox.update = function(){};
            }
            else
            {
				var statT = null;
				if(obj.backgroundColors)
				{
					if(obj.backgroundColors[i][j])
					{
						row.addRectangle( "rect"+i, { hexValue: obj.backgroundColors[i][j], text: itemList[i][j], width: colWidths[j], height: 15 });
					}
					else 
					{
						var displayStr = itemList[i][j] != undefined ? itemList[i][j] : "";
						displayStr = displayStr.length < maxChar ? displayStr : displayStr.substr(0, maxChar-2) + "...";

						statT = row.add("statictext", undefined, displayStr);
						statT.preferredSize.width = colWidths[j] + defaultColSpacing;
					}
				}
				else
				{
					var displayStr = itemList[i][j] != undefined ? itemList[i][j] : "";
					displayStr = displayStr.length < maxChar ? displayStr : displayStr.substr(0, maxChar-2) + "...";

					statT = row.add("statictext", undefined, displayStr);
					statT.preferredSize.width = colWidths[j] + defaultColSpacing;
				}

				// optional: static text grayed out
				if(statT)
				{
					if(enabledChunksArrMatchesItemsLength)
					{
						statT.enabled = obj.enabledChunksArr[i][j];
					}
				}
            }
        }
        rows.push(row);
    }

	// multiple platform/versions support is *extremely* messy
	// macOS scrolling: smooth, sort of
	// Windows: ugh

    var scrollBar = c.add("scrollbar");
    scrollBar.stepdelta = c.maximumSize.height;
    scrollBar.maximumSize.height = c.maximumSize.height;

    scrollBar.onChanging = function ()
    {
        col.location.y = -1 * this.value;
    };

    obj.dialog.onShow = function()
    {
        scrollBar.size = [ barW, c.size.height ];
        scrollBar.location = [ (c.size.width-barW), 0 ];
        scrollBar.maxvalue = col.size.height - c.size.height;
    };

    var containerFooter = container.addRow( { margins: [0,10,0,0], alignment: "fill", alignChildren: ["left", "center"] });

    // if using checkboxes, include buttons to support select/deselect all
    if( (typeof itemList[0][0]) == "boolean" )
    {
        containerFooter.add("statictext", undefined, "Select:");

        var selectAllBtn = containerFooter.addButton( { label: "All", name: "select-all", width: 60, height: 22, helpTip: "Select all items", onClickFunction: function(){
			c._rows.filter( function(el){ if(el._checkbox.value != true) { el._checkbox.value = true; return true; } });
		} });

        var selectNoneBtn = containerFooter.addButton( { label: "None", name: "select-none", width: 70, height: 22, helpTip: "Uncheck all items", onClickFunction: function(){ 
			c._rows.filter( function(el){ if(el._checkbox.value != false) { el._checkbox.value = false; return true; } });
		} });
	
		var restoreSelectionBtn = containerFooter.addButton( { label: "Restore", name: "restore-selection", width: 80, height: 22, helpTip: "Restore initial selection", onClickFunction: function(){ 
			c._rows.map( function(el){ el._checkbox.value = el._initialCheckboxValue; });
		} });
	}

    // if confirm function provided, add dismiss/continue CTA button to footer
    if(obj.onConfirmFunction)
    {
		var dismissBtn = null;
		// if(!obj.backButton)	
		if(!(obj.backButton instanceof Function))
		dismissBtn = containerFooter.addButton( { label: "Dismiss", name: "cancel", width: 125, height: 32, alignment: ["right","top"] }); 
		
		var continueBtn = null;

		// dialog may already be aware that nothing will happen, in that case, continue button should be disabled
		var continueButtonCfg = {
				width: 125, 
				height: 32, 
				label: obj.confirmButtonLabel ? obj.confirmButtonLabel : "Continue", 
				helpTip: obj.confirmButtonHelpTip ? obj.confirmButtonHelpTip : "Process", 
				name: "ok", 
				alignment: ["right","top"]		 
		};

		if(obj.disableConfirmButton)
		{
			continueButtonCfg.disabled = true;
			continueBtn = containerFooter.addButton( continueButtonCfg );
		}
		else
		{
			continueButtonCfg.onClickFunction = function(){ 
			    obj.dialog.close( obj.onConfirmFunction() );
			}
			
			continueBtn = containerFooter.addCloseButton( continueButtonCfg );
		}

		// default focused button closes the window without doing anything
        if(dismissBtn) dismissBtn.active = true;
    }
	else
	{
		containerFooter.addCloseButton( { label: obj.confirmButtonLabel ? obj.confirmButtonLabel : "Continue", helpTip: obj.confirmButtonHelpTip ? obj.confirmButtonHelpTip : "Process", name: "ok", alignment: ["right","top"] });
	}

	// expose components
    c._rows = rows; 
	c._header = containerHeader;
	c._footer = containerFooter;

	// make panel aware of its parent
	if(autoDialog)
	{
		c._window = obj.dialog;
	}

    return c;
}

// wrapper for prefab textedit window
// should support simple enum definitions such as 
//	"portrait", "landscape", "thin", "fat", "columns"
// TODO: works best with arrays, fix object collision :D
JSUI.createTextDisplayDialog = function( obj, str )
{
	if(!obj) return;
	
	// auto format based on content
	if(obj instanceof Array)
	{
		var obj = { 
			items: obj, 
			text: JSON.stringify( obj, null, '\t'), 
			count: obj.length,
			// message: (str == undefined) ? '':(str+'\n'),
			message: str
		};
	}
	// if XMP object, auto-serialize
	else if(obj instanceof XMPMeta)
	{
		var xmpStr = obj.serialize();
		var obj = { 
			items: [ xmpStr ], 
			text: xmpStr, 
			count: 0, 
			title: "Raw XMP", 
			// message: "Packet length: " + xmpStr.length + (str ? ("\n" + str):''), 
			message: (str ? ("\n" + str):''), 
			width: 800
		};
	}
	// if object, let's assume JSON
	else if( typeof obj == "object")
	{
		// this won't work with complex objects which have array structures
		// such as Document.artboards

		// if(obj.length) return;
		if(typeof str === "string")
		{
			var jsonStr = JSON.stringify(obj, null, '\t');
			var obj = { 
				items: [ jsonStr ], 
				text: jsonStr, 
				message: str, 
				count: 0 
			};
		}
		else if(obj.items instanceof Array)
		{
			var jsonStr = JSON.stringify(obj.items, null, '\t');
			var obj = { 
				items: obj.items, 
				text: jsonStr, 
				message: null, 
				count: obj.items.length 
			};
		}
		else if( typeof obj.text == "string")
		{
			var obj = {  
				text: obj.text, 
			};
		}
	}
	// basic text
	else if( typeof obj == "string")
	{
		var obj = { 
			items: [ obj ], 
			text: obj, 
			message: null, 
			count: 0 
		};
	}
	else
	{
		// catch all: include object as part of array
		var obj = { 
			items: [ obj ], 
			text: null, 
			message: str, 
			count: 0 
		};
	}
	if(!obj) return;

	if(obj.count == undefined) obj.count = 0;
	if(obj.doShow == undefined) obj.doShow = true;
	if(obj.items == undefined) obj.items = [];

	if(isNaN(obj.width)) obj.width = 500;
	if(isNaN(obj.height)) obj.height = 700;

	var win = new JSUI.createDialog( { 
		title: obj.title ? obj.title : ' ', 
		message: (obj.message != undefined) ? obj.message : ((obj.count !== 0) ? (obj.items.length + " item" + (obj.items.length>1?'s':'')) : undefined),
		spacing: 10,
		width: obj.width, 
		height: obj.height, 
		debugInfo: false 
	} );

	// // basic window should have built-in header, center, footer 
	// if(obj.message)
	// {
	//     var itemCountStr = ((obj.count !== 0) ? (obj.items.length + " item" + (obj.items.length>1?'s':'')) : undefined);
	//     var rawXMPTitleStr = "Raw XMP";
	//     var rawXMPPacketLengthStr = "Packet length: " + obj.text.length;

	//     if((obj.message != itemCountStr) && (obj.message != rawXMPTitleStr) && (obj.message != rawXMPPacketLengthStr))
	//     {
	//         var headerText = win._header.addStaticText( { width: 300, text: obj.message, alignment: ['left','top'] } );
	
	//         // headerText.alignment = 'left';
	//     }
	// }

	var text = win._container.addEditText( undefined, { 
		text: obj.text,
		multiline: true,
		width: obj.width ? obj.width-25 : 475, 
		height: obj.height ? obj.height-25 : 675, 

		disabled: false,
		readonly: obj.readonly == undefined ? true : obj.readonly
	});

	// override functions to avoid clashing with JSUI prefs
	text.onChange, text.onChanging = function(){};

	//// "Commit" button instead of "Close": returns text
	// if(obj.doReturnContent)
	// {
	//     var commitBtn = win._footer.addCloseButton( { label: 'Commit', helpTip: "Close dialog", width: 125, height: 26 } );
	//     commitBtn.onClick = function ()
	//     {
	//         // var str = text.text;
	//         win.close();
	//         return text.text;
	//     }
	// }
	// else
	// {
		// var buttonName = obj.doReturnContent ? 'ok' : 'cancel';
		// var buttonLabel = //obj.doReturnContent ? 'Commit' : 'Dismiss';
win._footer.alignment= [ 'center', 'bottom'];

		win._footer.addCloseButton( { 
			name: obj.doReturnContent ? 'ok' : 'cancel', 
			label: 'Dismiss', 
			helpTip: 'Close dialog', 
			width: 125, 
			height: 26, 
			alignment: [ 'center', 'bottom'],
			onClickFunction: obj.doReturnContent ? function(){
				var str = text.text;
				// check if string different?
				var strUpdated = obj.text != str;
				win.close();
				return str;
			} : undefined
		} );
	// }

	win._textStr = text.text;

	if(obj.makeTextActive) text.active = true;

	win.onShow = function(){

	}

	win.onClose = function(){
		// win._textStr = text.text;
		return text.text;
	}

	// namespace + property filter
	// dropdown list

	win._text = text;

	// opportunity to further modify dialog and callbacks before showing
	//      .onShow()   .onClose()
	return obj.doShow ? win.show() : win;
}


// INI FILE MANAGEMENT
// functions adapted from Xbytor's Stdlib.js

throwFileError = function(f, msg)
{
	if(msg == undefined) msg = ''; 
	throw msg + '\"' + f + "\": " + f.error + '.';
};

JSUI.convertFptr = function(fptr)
{ 
	var f; 
	if (fptr.constructor == String)
	{ 
		f = File(fptr);
	} 
	else if (fptr instanceof File || fptr instanceof Folder)
	{ 
		f = fptr;
	}
	else
	{
		throw "Bad file \"" + fptr + "\" specified.";
	}

	return f;
};

JSUI.writeToFile = function(fptr, str, encoding)
{
	//var success = false;

	// encoding should be either "utf8" or "ascii" (?)
	//var encoding = encoding != undefined ? encoding : false;

	var file = JSUI.convertFptr(fptr);
	if(!file.parent.exists)
	{	file.parent.create();}

	file.open("w") || throwFileError(file, "Unable to open output file "); 
	if (encoding)
	{
		file.encoding = encoding;
	}
	file.write(str); 
	file.close();

	return file.exists;
};

JSUI.readFromFile = function(fptr, encoding)
{
	var file = JSUI.convertFptr(fptr);

	file.open("r") || throwFileError("Unable to open input file ");
	if (encoding)
	{
		file.encoding = encoding;
	} 
	var str = file.read();
	file.close();
	
	return str;
};

// object to ini string
JSUI.toIniString = function(obj)
{
	var str = '';
	for (var idx in obj)
	{
	
		if (idx.charAt(0) == '_' || idx == "Components")
		{
			continue;			
		}
	
		var val = obj[idx];

		if (typeof val == "string" || typeof val == "number" || typeof val == "boolean" )
		{
			str += (idx + ": " + val.toString() + "\n");
		}

		else if( typeof val == "object" )
		{
			// if object has a length, it's an array!
			if(idx.length)
			{

				str += (idx + ": " + (val != undefined ? "["+val.toString()+"]" : null) + "\n");
			}
		
			// otherwise ignore (for now)
			else
			{

			}
		}
	
		// get all the JSUI function objects through here
		else
		{
			
		}
	} 

	return str;
};

// fromIniString adjustments (type = true: attempts to infer type based on value)
JSUI.fromIniString = function (str, obj, type)
{
	var type = type != undefined ? type : false;
	
	if(!obj) { obj = {} };

	var lines=str.split(/\r|\n/);
	var rexp=new RegExp(/([^:]+):(.*)$/);

	for(var i=0;i<lines.length;i++)
	{
		var line=lines[i].trim();
		if(!line||line.charAt(0)=='#')
		{continue}
		var ar=rexp.exec(line);
		if(!ar)
		{
			alert("Bad line in config file: \""+line+"\"");
			return
		}
		
		// assign variables
		var prop = ar[1].trim();
		var value = ar[2].trim();

		if(!type)
		{
			obj[prop] = value;
		}
		else
		{ 
			// empty string? leave as is
			if(value == '')
			{
				obj[prop] = value;
			}
			
			// force Boolean
			else if(value == 'true' || value == 'false')
			{
				obj[prop] = (value == 'true');
			}
		
			// null means null, right?
			else if(value =='null')
			{
				obj[prop] = null;
			}
	
			// case for Arrays: if first and last characters are brackets...
			else if( value[0] == "[" && value[value.length-1] == "]")
			{			
				// trim brackets from string
				value = value.replace('[', '');
				//value = value.shift();
				value = value.replace(']', '');
				//value = value.pop();
				obj[prop] = value.split(',');
			}
			
			// force Number
			else if( !isNaN(Number(value)) )
			{
				// Workaround for cases where "000000" which should remain as is
				
				// if string has more than one character, 
				// and if first character is a zero
				// and second character is not a dot (decimals etc)
				// then number or string was meant to keep its exact present form 
				if(value.length > 1 && ( (value[0] == "0" || value[0] == ".") && (value[1] != "." || value[1].toLowerCase() != "x") ) )  obj[prop] = value;

				//workaround for hex denomination format (also keep as string)
				else if(Number(value) != 0)
				{
					if(value[0] == "0" && value[1].toLowerCase() == "x") obj[prop] = value;
					else obj[prop] = Number(value);
				}

				
				// else do force number
				else
				{
					obj[prop] = Number(value);
				}
			}
	
			// otherwise just leave as String
			else 
			{
				// ignore internal stuff, of course
				if(prop != "INI_FILE")
				{
					obj[prop] = value;
				}
			}
		}
		
	}
	if($.level && JSUI.PrintINIstringInfo) JSUI.reflectProperties(obj, "\n[READING FROM INI STRING:]");
	return obj;
};

JSUI.XMLfromFile = function( file, encoding )
{
	// encoding is only used if provided
	var str = JSUI.readFromFile(file, encoding);

	if(str)
	{
		return new XML(str);
	}
	else
	{
		return null;
	}
};

// "serialize" Object to XML structure
//
// default output format: 
// obj.property == <property>value</>
//
JSUI.toXML = function(obj, name, attrBool)
{
	if(obj == undefined || obj == null) return;
	attrBool = attrBool != undefined ? attrBool : false;

    try
    {
        var child = new XML('<' + name + '/>');

		if($.level) $.writeln(name + ":");
    	var props = obj.reflect.properties;

        for (var i in props)
        {
			// get property name
			var p = props[i];

			// skip if internal object member or part of Components
			if(p == "length" || p == "__proto__" || p == "__count__" || p == "__class__" || p == "reflect" || p == "Components" || p == "typename") continue;   

			// store corresponding object value
			var v = obj[p];

			var quotes = "";

			if($.level) $.writeln("\t" + i + ": " + p + "  " + v );

			// if object
            if(typeof v == "object")
            {
				// if object has length, treat as array
				if(v.length != undefined) 
				{
					var arrNode = new XML('<' + p + '/>');

					for (var a = 0; a < v.length; a++)
					{
						var nodeName = v[a];
						var arrIndexName = p+(a+1);

						if(attrBool)
						{
							arrNode.@[arrIndexName] = nodeName;
						}
						else
						{
							arrNode.appendChild(new XML('<'+arrIndexName+'>' + nodeName + '</'+arrIndexName+'>' ));
						}
					}
					child.appendChild(arrNode);
				}
				// treat as object
				else
				{
					var xmlChild = JSUI.toXML(v, p, attrBool);
					if(xmlChild != null) child.appendChild(xmlChild);
				}
            }
            else
            {
				// treat as string
				if(attrBool)
				{
					child.@[p] = encodeURI(v);
				}
				else
				{
					// var subNode = new XML('<' + p + '/>' )
					var subNode = new XML('<'+p+'>' + encodeURI(v) + '</'+p+'>' );
					// var subNode = new XML('<>' + v + '</>' );
					//subNode.Value = v;
					child.appendChild(subNode);
				}

            }
        }
        return child;
    }
    catch(e)
    {
        if($.level) $.writeln(e);
        return null;
    }
};

JSUI.writeXMLfile = function(xml, file) //, whitespaceBool)
{
	// abort if there is nothing to work with
	if(xml == null)
	{
		return false;
	}

	// if file object is not provided, assume we want to save content to internally-managed XML file
	if(file == undefined)
	{
		// check if XMLFILE file object was effectively populated
		if( JSUI.XMLFILE instanceof File)
		{
			file = JSUI.XMLFILE;
		}
		else
		{
			return false;
		}
	}

	var xmlStr = xml.toXMLString();
	JSUI.writeToFile( file, xmlStr, "UTF-8");

	return file.exists;
};

// wrapper for saving JSUI.PREFS to XML 
JSUI.saveXMLfile = function()
{
	// abort if internal XMLFILE file object was not effectively populated
	if( !(JSUI.XMLFILE instanceof File))
	{
		return false;
	}

	var xmlStr = JSUI.toXML(JSUI.PREFS, "JSUIPREFS");
	if(!xmlStr) return false;

	JSUI.writeToFile( JSUI.XMLFILE, xmlStr, "UTF-8");

	return JSUI.XMLFILE.exists;
};

JSUI.readIniFile = function(obj, fptr, type)
{
	var fptr = fptr != undefined ? fptr : JSUI.INIFILE;
	var obj = obj != undefined ? obj : JSUI.PREFS;
	var type = type != undefined ? type : true;
	
	if(!obj)
	{
		obj = {};
	}

	fptr = JSUI.convertFptr(fptr);
	
	if(!fptr.exists)
	{
		return obj;
	}

	var str = JSUI.readFromFile(fptr,type);
	var nObj = JSUI.fromIniString(str,obj,type);

	return nObj;
};

JSUI.writeIniFile = function(fptr, obj, header)
{
	var fptr = fptr != undefined ? fptr : JSUI.INIFILE;
	var obj = obj != undefined ? obj : JSUI.PREFS;
	var header = header != undefined ? header : JSUI.TOOLNAME;
	
	// validate header with # and carriage return if needed
	if(header)
	{
		if(header[0] != "#") header = "#" + header;
		if(header[header.length-1] != "\n") header += "\n";
	}
	var str = header?header:'';
	str += JSUI.toIniString(obj);
	
	if($.level && JSUI.PrintINIstringInfo) 
 	{
 		JSUI.reflectProperties(obj, "\n[WRITING TO INI STRING:]");
 	}
	JSUI.writeToFile(fptr,str);
};

// write to specific JSON file URI
JSUI.writeJSONfile = function(f, obj)
{
	var f = f != undefined ? f : JSUI.JSONFILE;
	var obj = obj != undefined ? obj : JSUI.PREFS;
	
	var str = JSON.stringify(obj, null, "\t");

	if($.level && JSUI.PrintINIstringInfo) 
 	{
 		JSUI.reflectProperties(obj, "\n[WRITING TO JSON STRING:]");
 	}
	JSUI.writeToFile(f, str);
	return f;
};

// wrapper for quickly saving JSON prefs
JSUI.saveJSONfile = function()
{
	// abort if JSONFILE file object was not effectively populated
	if( !(JSUI.JSONFILE instanceof File))
	{
		return false;
	}

	var jsonStr = JSON.stringify(JSUI.PREFS, null, "\t");

	JSUI.writeToFile( JSUI.JSONFILE, jsonStr, "UTF-8");

	return JSUI.JSONFILE.exists;
};

JSUI.readJSONfile = function(obj, f, type)
{
	var f = f != undefined ? f : JSUI.JSONFILE;
	var obj = obj != undefined ? obj : JSUI.PREFS;
	var type = type != undefined ? type : true;
	
	if(!obj)
	{
		obj = {};
	}

	f = JSUI.convertFptr(f);
	
	if(!f.exists)
	{
		return obj;
	}

	var str = JSUI.readFromFile(f, type);
	var nObj = JSON.parse(str);

	return nObj;
};

JSUI.isObjectEmpty = function(obj, getJsonStr)
{
	if(typeof obj == "object")
	{
		// will fail with any object that has a constructor that isn't "Object"
		// with those we can safely assume they are not empty
		var isEmpty = false;
		var jsonStr = "";
		if(obj instanceof Object)
		{
			var hasConstructor = false;
			var constructorName = "";
			try{

				hasConstructor = obj.constructor != undefined;
				if(hasConstructor)
				{
					constructorName = obj.constructor.name;

					// $.writeln("NO CONSTRUCTOR");

					// $.writeln("constructor name: " + constructorName);
					if(constructorName !== "Object")
					{
						if(constructorName == "Array")
						{
							jsonStr = JSON.stringify(obj, null, "\t");
							if(getJsonStr) return jsonStr;
							return false;
						}
						// $.writeln("SPECIAL CONSTRUCT: " + constructorName);
						// $.writeln("RETURNING PLACEHOLDER JSON STR: " + getJsonStr);

						if(getJsonStr) return '{\n\n}';
						return isEmpty;
					}
					else
					{
						// $.writeln("JSON CONSTRUCT: " + constructorName);
						// $.writeln("RETURNING PLACEHOLDER JSON STR: " + getJsonStr);

						jsonStr = JSON.stringify(obj, null, "\t");

						// $.writeln("JSON STR: \n" + jsonStr);

						isEmpty = jsonStr === '{\n\n}';
						if(!isEmpty && getJsonStr) return jsonStr;

						// $.writeln("EMPTY.");
						return isEmpty;
					}
					// jsonStr = JSON.stringify(obj);
					// isEmpty = jsonStr === '{\n\n}';
					// if(!isEmpty && getJsonStr) return jsonStr;
					// return isEmpty;
				}
				else
				{

				}

			}catch(e){

				// if(constructorName.length) 
				// $.writeln("ERROR CATCHING CONSTRUCTOR NAME\n"+e);
			}

			// $.writeln("constructor name: " + constructorName);

			try{
				jsonStr = JSON.stringify(obj);
				isEmpty = jsonStr === '{\n\n}';
				if(!isEmpty && getJsonStr) return jsonStr;
				return isEmpty;
			}catch(e){ 
				// $.writeln("ERROR STRINGIFYING\n"+e);
				return false; 
			}
		}
		if(!isEmpty && getJsonStr) return jsonStr;
		else return false;
	}
	else return false;
};

// for quick console logging of objects (JSON) or arrays -- watch out, messy.
JSUI.quickLog = function(obj, arrDepthInt, msgStr, showType)
{
	if($.level)
	{
		if(showType == undefined) var showType = false;
		if(obj == undefined) return;

		var resultStr = "";

		if( msgStr == undefined && (typeof arrDepthInt == "string")) 
		{
			var msgStr = arrDepthInt;
			var arrDepthInt = 0;
			msgStr = "";
		}
		if(arrDepthInt === undefined) var arrDepthInt = 0;

		if(obj === 0)
		{	
			return JSUI.quickLog("0", arrDepthInt, msgStr, showType);
		}

		if(obj === null)
		{	
			return JSUI.quickLog("null", arrDepthInt, msgStr, showType);
		}

		var indent = "";
		for(var i = 1; i < arrDepthInt; i++)
		{
			indent += "\t";
		}
		if(msgStr === undefined)
		{
			var msgStr = "";
		}

		if(msgStr.length)
		{ 
			$.writeln( msgStr );
		}

		var typeOfData = typeof obj;

		// if object but NOT array
		if((typeOfData == "object") && !(obj instanceof Array))
		{
			if( (obj instanceof File) || (obj instanceof Folder))
			{ 
				var fsObjType = (obj instanceof File) ? 'FILE' : 'FOLDER'; 
				var str = indent+obj.fsName + (showType ? ("    "+fsObjType) : ""); 
				$.writeln( str ); 
				return str; 
			}
			// JSON or other type (?)
			else
			{
				var str = "";

				// "safely" check for empty JSON, lol
				var isJSONobj = false;
				var isEmptyJSONobj = false;
				isEmptyJSONobj = JSUI.isObjectEmpty( obj, true );
				var constructType = undefined;
				var typeNameStr = undefined;

				// $.writeln( isEmptyJSONobj ); 

				// this returns the JSON string itself (to avoid stringifying several times unless relevant)
				if(typeof isEmptyJSONobj == "string")
				{
					isJSONobj = isEmptyJSONobj.length > 0;
				}
				// if(isJSONobj && isEmptyJSONobj)
				if(isJSONobj)
				{
					constructType = obj.constructor.name;				
					var tmpJsonObj = isEmptyJSONobj;
					str = indent+(tmpJsonObj) + (showType ? ("    JSON OBJECT") : "");

					$.writeln(str); 
					return str;
				}
				else
				{
					typeNameStr = obj.typename;

					var objStr = "";
					try{
						objStr = JSON.stringify(obj, null, "\t");
					}catch(e){
						
					}

					try{
						objStr = '{\n\n}';
					}catch(e){

					}

					if(objStr.length && objStr != '{\n\n}')
					{
						str = indent+objStr + (showType ? ("    " + typeNameStr.toUpperCase()) : "");
						$.writeln(str); 
						return str;
					}

					// attempt to catch most constructors behaving as arrays,
					// those will have a typename:
					// PHSP 
					//		Document.layers
					// ILST 
					// 		Document.artboards
					//

					// if( obj instanceof XMPMeta)
					// {
					// 	$.writeln("XMPMeta");
					// }

					if(obj.length != undefined)
					{
						str = indent+str + (showType ? ("    "+obj.typename) : ""); 

						$.writeln(str);
						return str;
					}
					// the rest should have a constructor
					else 
					{
						str = indent+str + (showType ? ("    "+obj.constructor.name) : ""); 

						$.writeln(str);
						return str;
					}
				}
			}
		}
		// if dealing with array
		else if((typeOfData == "object") && (obj instanceof Array))
		{
			$.writeln(indent+"[");
			for(var i = 0; i < obj.length; i++)
			{
				var arrItem = obj[i];
				if((arrItem instanceof Object) || (arrItem instanceof Array))
				{
					var arrItemStr = JSON.stringify( arrItem, null, indent ? indent+'\t\t' : '\t\t');
					arrItemStr = arrItemStr.replace('\n}', '\n\t}' + (i < obj.length-1 ? ',' : ''));

					var arrStr = JSUI.quickLog(indent+("\t")+arrItemStr, (arrDepthInt+1), msgStr, showType);
					resultStr += arrStr;
				}
				else
				{
					var objStr = (indent+("\t")+arrItem+ (showType ? ("    " + (typeof arrItem).toUpperCase()) : (i < obj.length-1 ? "," : "")));
					$.writeln(objStr);
					resultStr += objStr;
				}
			}
			var indentStr = (indent+"]");
			$.writeln(indentStr);
			resultStr += indentStr;
		}
		// assume string/number/boolean
		else if(typeOfData == "string" || typeOfData == "number" || typeOfData == "boolean")
		{
			var simpleTypeStr = (indent+obj+ (showType ? ("    " + typeOfData.toUpperCase()) : ""));
			$.writeln(simpleTypeStr);
			resultStr += simpleTypeStr;

		}
		// tackle complex Object types by elimination
		else
		{
			var simpleTypeStr = (indent+obj+ (showType ? ("    " + typeOfData.toUpperCase()) : ""));
			$.writeln(simpleTypeStr);
			resultStr += simpleTypeStr;
		}

		return resultStr;
	}
	else return "";
}

// // quick fix if anything breaks the above function:
// JSUI.quickLog = function(str) { if($.level) $.writeln( str.toString() ); }

// high resolution timer -- used twice in a row to make sure that we are not working with a rogue / leak
JSUI.startTimer = function()
{
	if(JSUI.allowTimers)
	{
		$.hiresTimer;
		$.hiresTimer;
	}
}

JSUI.stopTimer = function( show )
{
	if(JSUI.allowTimers)
	{
		var durationSec = ($.hiresTimer * 0.000001);
		var durationStr =  durationSec + " sec";
		var msg = "Duration: " + durationStr;
		if($.level) $.writeln(msg);
		if(show)
		{
			JSUI.alert(msg);
		}

		return durationSec;
	}
}

// write/modify a single property value to/from  INI file
// without affecting the current scope's JSUI.PREFS values
JSUI.writeProperty = function(file, propertyName, propertyValue, header)
{
	var file = file != undefined ? file : JSUI.INIFILE;
	var header = header != undefined ? header : JSUI.TOOLNAME;

	// validate header with # and carriage return if needed
	if(header)
	{
		if(header[0] != "#") header = "#" + header;
		if(header[header.length-1] != "\n") header += "\n";
	}
	else
	{
		header = ("# " + JSUI.TOOLNAME + " Settings [jsuiLib v" + JSUI.version + "]\n");
	}
	var fileRef = new File(file);
	var nObj = {};

	if(fileRef.exists)
	{
		var str = JSUI.readFromFile(file, true);

		// if header present, keep as is?
		//
		
		nObj = JSUI.fromIniString(str, nObj, true);
	}
	
	// add/replace property value
	nObj[propertyName] = propertyValue;
	JSUI.writeIniFile(file, nObj, header);
};

// 
JSUI.saveIniFile = function()
{
	// JSON/XML config hack, don't mind me
	if(JSUI.JSONfileActive)
	{
		JSUI.saveJSONfile();
	}
	else if (JSUI.XMLfileActive)
	{
		JSUI.saveXMLfile();
	}
	else //if (JSUI.INIfileActive)
	{
		JSUI.writeIniFile(JSUI.INIFILE, JSUI.PREFS, "# " + JSUI.TOOLNAME + " Settings [jsuiLib v" + JSUI.version + "]\n");
		if($.level) $.writeln("Settings stored successfully.");
	}
};

JSUI.deleteIniFile = function()
{
	if(JSUI.INIFILE.exists)
	{
		JSUI.debug("Removing " + JSUI.INIFILE.fsName);

		try
		{
			JSUI.INIFILE.remove();		
		}
		catch(e)
		{
			alert("Error deleting settings file:\n\n" + JSUI.INIFILE.fsName + "\n\n" + e);
		}
	}
};

JSUI.openIniFileLocation = function()
{
	JSUI.debug("Opening INI file location: " + JSUI.INIFILE.parent.fsName);

	// try
	// {
	// 	JSUI.INIFILE.parent.execute();	
	// }
	// catch(e)
	// {
	// 	alert("Error opening settings file:\n\n" + JSUI.INIFILE.parent.fsName + "\n\n" + e);
	// }

	if(JSUI.INIfileActive)
	{
		if(JSUI.INIFILE instanceof File)
		{
			if(JSUI.INIFILE.exists)
			{
				if(JSUI.isWindows)
				{
					JSUI.INIFILE.parent.execute();	
				}
				else
				{
					var msg = "Hello macOS user!\n\nHere is the location of the config file.\nYou may navigate to it in Finder using Shift+Command+G ";
					var ttl = JSUI.TOOLNAME;
					JSUI.prompt( { message: msg, text: JSUI.INIFILE.fsName, title: ttl } );
				}
			}
		}
	}
};

JSUI.saveConfigFile = function()
{
	if (JSUI.JSONfileActive)
	{
		if(JSUI.JSONFILE instanceof File)
		{
			JSUI.saveJSONfile();
		}
	}
	else if (JSUI.XMLfileActive)
	{
		if(JSUI.XMLFILE instanceof File)
		{
			JSUI.saveXMLfile();
		}
	}
	else if (JSUI.INIfileActive)
	{
		if(JSUI.INIFILE instanceof File)
		{
			JSUI.writeIniFile(JSUI.INIFILE, JSUI.PREFS, "# " + JSUI.TOOLNAME + " Settings [jsuiLib v" + JSUI.version + "]\n");
			if($.level) $.writeln("Settings stored successfully.");
		}
	}
};

JSUI.deleteConfigFile = function()
{
	if(JSUI.JSONfileActive)
	{
		if(JSUI.JSONFILE instanceof File)
		{
			if(JSUI.JSONFILE.exists)
			{
				JSUI.JSONFILE.remove();	
			}
		}
	}
	else if (JSUI.XMLfileActive)
	{
		if(JSUI.XMLFILE instanceof File)
		{
			if(JSUI.XMLFILE.exists)
			{
				JSUI.XMLFILE.remove();
			}
		}
	}
	else if (JSUI.INIfileActive)
	{
		if(JSUI.INIFILE instanceof File)
		{
			if(JSUI.INIFILE.exists)
			{
				JSUI.INIFILE.remove();		
			}
		}
	}
};

JSUI.openConfigFileLocation = function()
{
	if(JSUI.JSONfileActive)
	{
		if(JSUI.JSONFILE instanceof File)
		{
			if(JSUI.JSONFILE.exists)
			{
				if(JSUI.isWindows)
				{
					JSUI.JSONFILE.parent.execute();	
				}
				else
				{
					var msg = "Hello macOS user!\n\nHere is the location of the config file.\nYou may navigate to it in Finder using Shift+Command+G ";
					var ttl = JSUI.TOOLNAME;
					JSUI.prompt( { message: msg, text: JSUI.JSONFILE.fsName, title: ttl } );
				}
			}
		}
	}
	else if (JSUI.XMLfileActive)
	{
		if(JSUI.XMLFILE instanceof File)
		{
			if(JSUI.XMLFILE.exists)
			{
				if(JSUI.isWindows)
				{
					JSUI.XMLFILE.parent.execute();	
				}
				else
				{
					var msg = "Hello macOS user!\n\nHere is the location of the config file.\nYou may navigate to it in Finder using Shift+Command+G ";
					var ttl = JSUI.TOOLNAME;
					JSUI.prompt( { message: msg, text: JSUI.XMLFILE.fsName, title: ttl } );
				}
			}
		}
	}
	else if (JSUI.INIfileActive)
	{
		if(JSUI.INIFILE instanceof File)
		{
			if(JSUI.INIFILE.exists)
			{
				if(JSUI.isWindows)
				{
					JSUI.INIFILE.parent.execute();	
				}
				else
				{
					var msg = "Hello macOS user!\n\nHere is the location of the config file.\nYou may navigate to it in Finder using Shift+Command+G ";
					var ttl = JSUI.TOOLNAME;
					JSUI.prompt( { message: msg, text: JSUI.INIFILE.fsName, title: ttl } );
				}
			}
		}
	}
};

// this should allow resetting preferences with either a custom object, or a local constructor
JSUI.resetPreferences = function( obj, saveOnReset )
{
	if(obj == undefined) var obj = {};
	JSUI.PREFS = obj;
	if(saveOnReset) JSUI.saveConfigFile();
};

// test for empty object 
if(typeof JSON !== "undefined")
{
	if(!Object.prototype.isEmpty) { Object.prototype.isEmpty = function()
	{
		return JSON.stringify(this) === '{\n\n}';
	}}
}

// XBytor's string trim
if(!String.prototype.trim) { String.prototype.trim = function()
{
	// return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
	return this.replace(/^[\s]+|[\s]+$/g,'');
}}

// get array of indexes for given string (case-sensitive, don't use RegExp here)
// e.g: var stringWithLinebreaks.indexesOf('\n'); // [52,103]
if(!String.prototype.indexesOf) { String.prototype.indexesOf = function( str )
{
	if(typeof str !== "string") return [];
	var arr = [];
	var i = -1;
	while((i = this.indexOf(str, i+1)) >= 0) { arr.push(i);	}
	return arr;
}}

// this does not like zeroes!
if(!String.prototype.padStart) { String.prototype.padStart = function(num, pad)
{
	if(!num) var num = 6;
	if(!pad) var pad = " ";
	if(pad == "0") return this.zeroPad(num);

	num = Math.min(num, this.length)
	var padStr = "";
	if(this.length < num)
	{
		for(var i = 0; i < num; i++)
		{
			padStr += pad;
		}
	}
	return padStr +""+ this;
}}

if(!String.prototype.zeroPad) { String.prototype.zeroPad = function(num)
{
	if(!num) var num = 3;
	var padStr = "";
	if(this.length < num) { padStr = new Array(num - this.length+1).join("0"); }
	return padStr +""+ this;
}}

// remove special characters that will cause problem in a file system context
if(!String.prototype.toFileSystemSafeName) { String.prototype.toFileSystemSafeName = function(replaceStr)
{
	return this.replace(/[\s:\/\\*\?\!\"\'\<\>\|]/g, replaceStr ? replaceStr : "_");
}}

// get name without extension
if(!String.prototype.getFileNameWithoutExtension) { String.prototype.getFileNameWithoutExtension = function()
{
	var match = this.match(/([^\.]+)/);
	return match != null ? match[1] : null;
}}

// boolean indicating if string contains a ".ext" pattern
if(!String.prototype.hasFileExtension) { String.prototype.hasFileExtension = function()
{
	return this.getFileExtension() != null;
}}

// get extension pattern ".ext"
if(!String.prototype.getFileExtension){ String.prototype.getFileExtension = function()
{
	var match = this.trim().match(/\.[^\\.]+$/);
	return match != null ? match[0].toLowerCase() : null; // null if no match
}}

// toggles extension pattern found at end of string
if(!String.prototype.addRemoveExtensionSuffix) { String.prototype.addRemoveExtensionSuffix = function( str )
{
	var originalStr = this.trim();

	if(!str)
	{
		return originalStr;
	}

	var match = originalStr.match(/\.[^\\.]+$/);

	// var originalExt = originalStr.getFileExtension(); // need precise casing comparison
	var originalExt = match != null ? match[0] : "";
	var hasMatch = originalExt != null && originalExt != "";

	if(hasMatch)
	{
		// if suffix already present, remove or replace
		if(originalExt.toLowerCase() == str.toLowerCase())
		{
			return originalStr.replace(/\.[^\\.]+$/, "");
		}
		else
		{
			return originalStr.replace(/\.[^\\.]+$/, str);
		}
	}
	else
	{
		return originalStr + str;
	}
}}

if(!String.prototype.swapFileObjectFileExtension)
{
	// must FileObj.toString(), returns File object
	String.prototype.swapFileObjectFileExtension = function( newExtStr )
	{
		if(!newExtStr) return;
		var originalStr = this;
		var newStr = originalStr;

		newStr = this.trim();
		var match = newStr.match(/\.[^\\.]+$/);

		if(match == null)
		{
			return originalStr;
		}

		var fileExt = newStr.getFileExtension();
		if(originalStr == fileExt)
		{
			return;
		}
		var newFileObj = new File(newStr.replace(/\.[^\\.]+$/, newExtStr.toLowerCase()));
		return newFileObj;
	}
}		
	
// str.hasSpecificExtension(".png") // "image.png" true   "image.jpg" false
if(!String.prototype.hasSpecificExtension) { String.prototype.hasSpecificExtension = function( str )
{
	return this.getFileExtension() == str;
}}

if(!String.prototype.getDocumentName) { String.prototype.getDocumentName = function()
{
	return this.trim().getFileNameWithoutExtension().toFileSystemSafeName();
}}
	
// an approximation! special characters are not encouraged, but allowed
if(!String.prototype.getAssetsFolderName) {	String.prototype.getAssetsFolderName = function()
{
	return (this.getDocumentName() + "-assets");
}}
	
if(!String.prototype.getAssetsFolderLocation) { String.prototype.getAssetsFolderLocation = function( folderUri, allowNonExistantBool, createBool, allowMultipleParentsCreationBool )
{
	var name = this.getAssetsFolderName();

	var currentDocument = false;
	var hasDocuments = app.documents.length;
	var matchesSystem = false;
	var targetFolder;

	// sanitize
	if(folderUri)
	{
		if( !(folderUri instanceof Folder))
		{
			if(typeof folderUri == "string")
			{
				folderUri = new Folder(folderUri);
			}
			// are we working with a File? if so, assume we want its parent
			if(folderUri instanceof File)
			{
				folderUri = folderUri.parent;
			}
		}

		var testFolder = new Folder(folderUri);

		if(testFolder.exists)
		{
			matchesSystem = JSUI.isWindows ? (testFolder.toString().match(app.path) != null) : (testFolder.toString() == ("/" + (hasDocuments ? app.activeDocument.name : "")));
			if(!matchesSystem)
			{
				targetFolder = testFolder;
			}
		}
		// it's entirely possible we want to point to a directory that will be created later on
		else
		{
			if(allowNonExistantBool) targetFolder = testFolder;
		}
	}
	// if no argument passed, assume we want to use current document
	else
	{
		if(hasDocuments)
		{
			currentDocument = true;
		}
		folderUri = JSUI.getDocumentFullPath();
		if(folderUri) targetFolder = folderUri.parent;
		if(!targetFolder) { return } // issue if document does not exist on disk
	}

	// var targetFolder = currentDocument ? JSUI.getDocumentFullPath() : location;
	// var location = app.documents.length ? ( JSUI.isPhotoshop ? app.activeDocument.path) : undefined;
	var assetsLocation = new Folder(targetFolder + "/"+ name);
	if(createBool)
	{
		if(allowMultipleParentsCreationBool)
		{
			assetsLocation.create();
		}
		else if(assetsLocation.parent.exists)
		{
			assetsLocation.create();
		}
	}
	// return targetFolder ? assetsLocation : undefined;
	return assetsLocation;
}}

// simple wrapper for creating "-assets" folder for current document
// only use this with app.activeDocument.name, on a document which has been saved to disk at least once
if(!String.prototype.createAssetsFolder) { String.prototype.createAssetsFolder = function()
{
	return this.getAssetsFolderLocation(undefined, undefined, true);
}}

// matches hexadecimal expression "0x001234"
String.prototype.getHexadecimalNumber = function()
{
	var str = this.trim();
	str = str.match(/0[xX][0-9a-fA-F]+/);

	return str;
}

// works with "@2x" and "@Dark"
String.prototype.hasAtSymbolSuffix = function( str )
{
	var match = this.match(/\@[^]*$/);
	return match == str;
}

String.prototype.hasAdobe2xSuffix = function()
{
	return this.hasAtSymbolSuffix("@2x");
}

String.prototype.hasAdobeDarkSuffix = function()
{
	return this.hasAtSymbolSuffix("@Dark");
}

if (!Array.isArray) { Array.isArray = function(arg)
{
	if (arg === void 0 || arg === null) {
		return false;
	}
	return (arg.__class__ === 'Array');
}}

if(!Array.prototype.isIntArray) { Array.prototype.isIntArray = function( strict )
{
	for(var i = 0; i < (strict ? this.length : 1); i++)
	{
		var item = this[i];
		if( typeof item == "number" )
		{
			if(!item.isInteger()) return false;	
		}
		else return false;
	}
	return true;
}}

if(!Array.prototype.isStringArray) { Array.prototype.isStringArray = function( strict )
{
	for(var i = 0; i < (strict ? this.length : 1); i++)
	{
		var item = this[i];
		if( typeof item != "string" )
		{
			return false;
		}
	}
	return true;
}}

if(!Array.prototype.isIntStringArray) { Array.prototype.isIntStringArray = function( strict )
{
	for(var i = 0; i < (strict ? this.length : 1); i++)
	{
		var item = this[i];
		if( typeof item == "string" )
		{
			if(!(parseInt(item).toString() == item)) return false;	
		}
		else return false;
	}
	return true;
}}

if(!Array.prototype.indexOf) { Array.prototype.indexOf = function(element, start)
{
	if(!this.length) return -1;
	var i = 0;
	var idxL = this.length-1;
	if(start == undefined) var start = i;
	start = start.clamp(-1, idxL);
	if(start == -1) { for(var i = idxL; i > -1; i--) { if(this[i] === element) return i; } }
	else { for(var i = start; i < this.length; i++) { if(this[i] === element) return i; } }
	return -1;
}}

if(!Array.prototype.lastIndexOf) { Array.prototype.lastIndexOf = function(element)
{
	return this.indexOf(element, -1);
}}

if(!Array.prototype.map) { Array.prototype.map = function(callback)
{
	var arr = [];
	for (var i = 0; i < this.length; i++)
		arr.push(callback(this[i], i, this));
	return arr;
}}

if (!Array.prototype.forEach) { Array.prototype.forEach = function(callback, thisArg)
{
	if (this === void 0 || this === null) {
		throw new TypeError('Array.prototype.forEach called on null or undefined');
	}
	var O = Object(this);
	var len = O.length >>> 0;
	if (callback.__class__ !== 'Function') {
		throw new TypeError(callback + ' is not a function');
	}
	var T = (arguments.length > 1) ? thisArg : void 0;
	for (var k = 0; k < len; k++) {
		var kValue;
		if (k in O) {
			kValue = O[k];
			callback.call(T, kValue, k, O);
		}
	}
}}

if (!Array.prototype.flat) { Array.prototype.flat = function ( arr )
{
	if(arr == undefined) var arr = [];
	for (var i = 0; i < this.length; i++)
	{
		var item = this[i];
		if (item instanceof Array){
			item.flat(arr);
		}else{
			arr.push(item);
		}
	}
	return arr;
}}

if (!Array.prototype.reduce) { Array.prototype.reduce = function(callback, initialValue)
{
	if (this === void 0 || this === null) {
	throw new TypeError('Array.prototype.reduce called on null or undefined');
	}

	if (callback.__class__ !== 'Function') {
	throw new TypeError(callback + ' is not a function');
	}

	var t = Object(this), len = t.length >>> 0, k = 0, value;

	if (arguments.length > 1) 
	{
		value = initialValue;
	} 
	else 
	{
		while (k < len && !(k in t)) {
		k++; 
		}
		if (k >= len) {
		throw new TypeError('Reduce of empty array with no initial value');
		}
		value = t[k++];
	}

	for (; k < len; k++) {
	if (k in t) {
		value = callback(value, t[k], k, t);
	}
	}
	return value;
}}

if(!Array.prototype.filter) { Array.prototype.filter = function (fn)
{
	if (fn.__class__ !== 'Function') {
		throw new TypeError(fn + ' is not a function');
		}

	var filtered = [];
	for (var i = 0; i < this.length; i++)
	{
		if(fn(this[i]))
		{
			filtered.push(this[i]);
		}
	}
	return filtered;
}}

// removes duplicates in array
if(!Array.prototype.getUnique) { Array.prototype.getUnique = function()
{
	var unique = [];
	for(var i = 0; i < this.length; i++)
	{
		var current = this[i];
		if(unique.indexOf(current) == -1) unique.push(current);
	}
	return unique;
}}

// from array of JSON objects, compile list of identical values and return one of each
if(!Array.prototype.getUniqueValues) { Array.prototype.getUniqueValues = function( pname )
{
	if(!this.length) return this;
	var value = this[0][pname];
	if(value == undefined) return this;

	var uniqueNames = [ value ];
	var currValue = value;

	for(var i = 0; i < this.length; i++)
	{
		currValue = this[i][pname];
		if(currValue != undefined)
		{
			if(currValue != value)
			{
				uniqueNames.push(currValue);
				value = currValue;
			}
		}
	}
	return uniqueNames;
}}

// sort indexes
if(!Array.prototype.sortAscending) { Array.prototype.sortAscending = function()
{
	return this.sort(function(a, b){return a - b});
}}

if(!Array.prototype.sortDescending) { Array.prototype.sortDescending = function()
{
	return this.sort(function(a, b){return b - a});
}}

// [1, 2, 3, 4, 8, 10, 11, 12, 15, 16, 17, 18, 29]
// becomes "1-4,8,10-12,15-18,29"
if(!Array.prototype.getRanges) { Array.prototype.getRanges = function()
{
	var ranges = ""; // [];
	var rstart;
	var rend;
	for (var i = 0; i < this.length; i++)
	{
		rstart = this[i];
		rend = rstart;
		while (this[i + 1] - this[i] == 1)
		{
			rend = this[i + 1]; // increment the index if the numbers sequential
			i++;
		}
		ranges += ((rstart == rend ? rstart+'' : rstart + '-' + rend) + ( i+1 == this.length ? "" : "," ));
	}
	return ranges;
}}

// [1, 2, 3, 4, 8, 10, 11, 12, 15, 16, 17, 18, 29]
// becomes "1-4,8,10-12,15-18,29"
if(!Array.prototype.toSimplifiedString) { Array.prototype.toSimplifiedString = function()
{
	var str = "";
	var ranges = [];

	var range = [];

	for(var i = 0; i < this.length; i++)
	{	
		var num = this[i];

		// mixed array content safeguard: if not number, try to cast, skip if fails
		if(isNaN(num)) num = parseInt(num);
		if(isNaN(num) || num == 0) continue;
		
		range.push(num);

		// if next number in array is not an increment, push array and reset count
		// if(this[i+1] != undefined)
		// {
			if( (num+1) != this[i+1] )
			{
				ranges.push(range);
				// if(this[i+1] == this[this.length-1]) ranges.push( [this[i+1]] );
				// avoid duplication of last item in ranges!
				if(this[i+1] == this[this.length-1] && this[i+1] != this[i]) ranges.push( [this[i+1]] );
				range = [];
			}
		// }
	}

	// reformat string
	for(var j = 0; j < ranges.length; j++)
	{
		var currentRange = ranges[j];
		var start = currentRange[0];
		var end = currentRange[currentRange.length-1];

		str += (start == end ? start : (start + "-" + end));

		if(j != (ranges.length-1))
		{
			str += ",";
		}
	}

	return str.length ? str : this.toString();
}}

// "1-4,8,10-12,15-18,29"
// becomes [1, 2, 3, 4, 8, 10, 11, 12, 15, 16, 17, 18, 29]
if (!String.prototype.toRangesArr) { String.prototype.toRangesArr = function()
{
	var arr = [];
	var str = this.trim();
	str = str.replace(/\s/g, "");
	var tmpArr = str.split(",");
	
	for(var i = 0; i < tmpArr.length; i++)
	{	
		var r = tmpArr[i];
		if(r == "") continue;
		if(r.match("-") != null)
		{
			var range = r.split("-");
			var start = parseInt(range[0]);
			var end = parseInt(range[1]);

			if(!isNaN(start) && !isNaN(end))
			{
				var rLength = end - start + 1;
				for(var r = 0; r < rLength; r++)
				{
					arr.push(start+r);
				}
			}
		}
		else
		{
			var intgr = parseInt(r);
			var hasInt = !isNaN(intgr);
			if(hasInt) arr.push(intgr);
		}
	}
	return arr.length ? arr.getUnique().sortAscending() : [];
}}

// "0, 1, 2-3,4,5,10-12, 8, 29,30,31, 11, 12,65, 66, 178"
// becomes "1-5,8,10-12,29-31,65-66,178"
// does not support negative numbers 
if (!String.prototype.toRangesStr) { String.prototype.toRangesStr = function()
{
	return this.toRangesArr().toSimplifiedString();
}}

if(!Number.prototype.isFinite) { Number.prototype.isFinite = function()
{
	var n = this.valueOf();
	if ( n === Infinity || n === -Infinity ) return false;
	else return true;
}}
	
if(!Number.prototype.isInteger) { Number.prototype.isInteger = function()
{
	var n = this.valueOf();
	return (Number(n) === n && (typeof n) === 'number') && isFinite(n) && (Math.floor(n) === n);
}}

if(!Number.prototype.isFloat) { Number.prototype.isFloat = function()
{
	var n = this.valueOf();
	return Number(n) === n && n % 1 !== 0;
}}

if(!Number.prototype.clamp) { Number.prototype.clamp = function(min, max)
{
	var n = this.valueOf();
	if(min == undefined || max == undefined) return n;
	if(n < min) n = min;
	if(n > max) n = max;
	return n;
}}

if(!Number.prototype.adjustFloatPrecision) { Number.prototype.adjustFloatPrecision = function(tolerance)
{
		if(tolerance == undefined) tolerance = 0.0001;
		var n = this.valueOf();
		var round = Math.round(n);
		var delta = Math.abs(round-n);
		if(delta <= tolerance) n = round;
		return n;
}}
	
Number.prototype.isPowerOf2 = function()
{
	var n = this.valueOf();
	var abs = Math.abs(n);

    if(Math.floor(n) !== n) return false;
	if(abs !== n) n = abs;
    return n && (n & (n - 1)) === 0;
}

Number.prototype.getNextPow2 = function()
{
	var p = 2;
	var n = Math.floor(this.valueOf());
	if(n.isPowerOf2()) n++;

	while(n > p)
	{
		p = p * 2;
	}
	return p;
}

Number.prototype.getPreviousPow2 = function()
{
	var p = 2;
	var n = this.valueOf();
	if(n.isPowerOf2()) n--;
	n = Math.floor(n);

	while(n >= p)
	{
		p = p * 2;
	}
	return p / 2;
}

Number.prototype.isMultOf = function(m)
{
	if(m == undefined || isNaN(m))
	{
		return;
	}
	var n = this.valueOf();
	return (Math.ceil(n/m) * m == n);
}

Number.prototype.getNextMultOf = function(m)
{
	var n = this.valueOf();
	if(n.isMultOf(m)) n++;
	return (n % m == 0) ? n : ( n + (m - (n % m)) );
}

Number.prototype.getPreviousMultOf = function(m)
{
	var n = this.valueOf();
	if(n.isMultOf(m)) n--;
	// return (n % m == 0) ? n : ( n + (m - (n % m)) );

	if(n % m == 0) return n;
	// else if(n < m) return n.getNextMultOf(m);
	else if(n < m) return m;
	else return n - (n % m);
}

Number.prototype.isMult4 = function()
{
	var n = this.valueOf();
	return n.isMultOf(4);
}

Number.prototype.getPreviousMult4 = function()
{
	var n = this.valueOf();
	n = n.getPreviousMultOf(4)
	return n;
}

Number.prototype.getNextMult4 = function()
{
	var n = this.valueOf();
	return n.getNextMultOf(4);
}

Number.prototype.isMult8 = function()
{
	var n = this.valueOf();
	return n.isMultOf(8);
};

Number.prototype.getPreviousMult8 = function()
{
	var n = this.valueOf();
	return n.getPreviousMultOf(8);
};

Number.prototype.getNextMult8 = function()
{
	var n = this.valueOf();
	return n.getNextMultOf(8);
}

// multiples of 16

Number.prototype.isMult16 = function()
{
	var n = this.valueOf();
	return n.isMultOf(16);
}

Number.prototype.getPreviousMult16 = function()
{
	var n = this.valueOf();
	return n.getPreviousMultOf(16);
}

Number.prototype.getNextMult16 = function()
{
	var n = this.valueOf();
	return n.getNextMultOf(16);
}

// multiples of 32

Number.prototype.isMult32 = function()
{
	var n = this.valueOf();
	return n.isMultOf(32);
}

Number.prototype.getPreviousMult32 = function()
{
	var n = this.valueOf();
	return n.getPreviousMultOf(32);
}

Number.prototype.getNextMult32 = function()
{
	var n = this.valueOf();
	return n.getNextMultOf(32);
}

if(!Number.prototype.formatBytes) { Number.prototype.formatBytes = function(decimals)
{
	var bytes = this.valueOf();
    if (!bytes) return '0 Bytes';
    if(decimals == undefined) var decimals = 2;
    var k = 1024;
    var dm = (decimals < 0) ? 0 : decimals;
    var sizesArr = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var sizeIndex = Math.floor(Math.log(bytes) / Math.log(k));
    var num = (bytes / Math.pow(k, sizeIndex)).toFixed(dm);
    var size = sizesArr[sizeIndex];
    return (num+' '+size);
}}

function Dictionary( allowOverwrite )
{
	this.overwrite = allowOverwrite === true;
	var __k = [];
	var __v = [];
	
	this.put = function(key, value){
		if(!this.overwrite || __k.indexOf(key) == -1){
			__k.push(key);
			__v.push(value);
		}
	}
	
    this.get = function(key){
        var idx = __k.indexOf(key);
		if(idx >= 0){
            return __v[idx];
		}
        return null;
	};
    
	this.remove = function(key){
		var i = __k.indexOf(key);
		if(i != -1){
			__k.splice(i,1);
			__v.splice(i,1);
		}
	}
	
	this.clearAll = function(value){
		for(var i = 0; i < __v.length; i++){
			if(__v[i] == value){
				__k.splice(i,1);
				__v.splice(i,1);
			}
		}
	}

	this.iterate = function(func){
		for(var i = 0; i < __k.length; i++){
			func(__k[i], __v[i]);
		}
	}
}

// similar to ScriptUIStates
function ScriptUICustomVectorGraphics( )
{
	this.shapes = ['0 0 48 0 48 48 0 48 0 0'];
	this.width = 48;
	this.height = 48;
	this.label = null;
	this.helpTip = null;
	this.color = null;

	// handle states if needed
	this.states = [];

	return this;
}

if(!Array.prototype.convertToObject) { Array.prototype.convertToObject = function( allowNullOrUndef, recursive )
{
	if(!this.length) return {};
	var obj = {};

	for(var i = 0; i < this.length; i++)
	{
		var item = this[i];
		var isArray = (item instanceof Array);

		// if array is unidimensional, force value to null
		if(!isArray)
		{
			var property = item;
			obj[property] = null; 
		}
		// bidimensional+
		else if ( isArray )
		{
			var property = this[i][0];

			// safeguard: if not a string, abort
			if(!(typeof property == "string"))
			{
				continue;
			}

			var value = this[i][1];
	
			var isUndef = value == undefined;
			var isNull = value == null;
	
			// if undefined or null, only store if allowed
			if(isUndef || isNull)
			{
				if(allowNullOrUndef)
				{
					obj[property] = value; 
				}
			}
			// recursive object is allowed if recursive arg
			else if(typeof value === "object")
			{
				if(recursive)
				{
					obj[property] = value; 
				}
				continue;
			}
			else
			{
				obj[property] = value; 
			}
		}
	}
	return obj;
}}

// simple data types object to bidimensional array
// obj = { name1: "value1", name2: "value2"}
// returns [ ["name1", "value1"], ["name2", "value2"]]
if(!Object.prototype.convertToArray) { Object.prototype.convertToArray = function( allowNullOrUndef )
{
	if(!this) return [];
	var arr = [];

	for (var key in this)
	{
		// let's not go any further here if function
		if(this[key] instanceof Function)
		{
			continue;
		}
		// watch out for reserved keywords and internal stuff
		else if (key.charAt(0) == '_' || key == "reflect" || key == "Components" || key == "typename")
		{
			continue;			
		}
		else
		{
			var property = key;
			var value = this[key];

			var isUndef = value == undefined;
			var isNull = value == null;
			if(isUndef || isNull)
			{
				if(allowNullOrUndef)
				{
					arr.push( [ property, value ] );
				}
			}
			else
			{
				arr.push( [ property, value ] );
			}
		}
	}

	return arr;
}}

// swap property names when found in bidimensional/tridimensional array
// affects first item for each set, a third item is allowed, may be useful for presentation purposes
//
// var originalArr = [ [ "source", "~/file.psd"], [ "range", "1-8"], [ "destination", "./images"] ];
// var converterArr = [ [ "source", "gitUrl" ], [ "destination", "relativeExportLocation" ] ]; 
// var newArr =  originalArr.convertTags(converterArr); // yields [ [ "gitUrl", "~/file.psd"], [ "range", "1-8"], [ "relativeExportLocation", "./images"] ];
//
// then convert back with reversed flag, and content should match precisely
// var reconvertedArr = newArr.convertTags(converterArr, true); // yields [ [ "source", "~/file.psd"], [ "range", "1-8"], [ "destination", "./images"] ]
if(!Array.prototype.convertTags) { Array.prototype.convertTags = function( converter, reversed )
{
	if(!this) return [];
	var newArr = [];

	for(var i = 0; i < this.length; i++)
	{
		var item = this[i];
		var matched = false;

		for(var j = 0; j < converter.length; j++)
		{
			var convItem = converter[j];
			if(item[0] == (reversed ? convItem[1] : convItem[0]))
			{
				var newItem = reversed ? [ convItem[0], item[1] ] : [ convItem[1], item[1] ];
				if(item.length == 3) newItem.push( item[2] );
				newArr.push( newItem );

				matched = true;
				break;
			}
		}
		if(!matched) newArr.push( item );
	}

	return newArr;
}}

// to be deprecated
JSUI.isPower2 = function(n){ return n.isPowerOf2(); };
JSUI.getNextPow2 = function(n){ return n.getNextPow2(); };
JSUI.getPreviousPow2 = function(n){ return n.getPreviousPow2(); };
JSUI.isMult = function(n, mult){ return n.isMultOf(mult); };
JSUI.getNextMult = function(n, mult){ return n.getNextMultOf(mult); };
JSUI.getPreviousMult = function(n, mult){ return n.getPreviousMultOf(mult); };
JSUI.isMult4 = function(n){ return n.isMultOf(4); };
JSUI.isMult8 = function(n){ return n.isMultOf(8); };
JSUI.isMult16 = function(n){ return n.isMultOf(16); };
JSUI.isMult32 = function(n){ return n.isMultOf(32); };

// clamp value
JSUI.clampValue = function(n, min, max)
{
	if(n < min)
	{
		n = min;
	}
	if(n > max)
	{
		n = max;
	}

	return n;
}

// required
if(JSUI.isPhotoshop)
{
	cTID = function(s){ if(JSUI.isPhotoshop) { return app.charIDToTypeID(s); } else { return;} };
	sTID = function(s){ if(JSUI.isPhotoshop) { return app.stringIDToTypeID(s); } else { return;} };
	tSID = function(t){ if(JSUI.isPhotoshop) { return app.typeIDToStringID(t); } else { return;} };
}

// workaround for Photoshop CS5/CS6 UI palette/dialog being weird on Windows
//	http://www.davidebarranca.com/2012/10/scriptui-window-in-photoshop-palette-vs-dialog/
JSUI.waitForRedraw = function()
{
	if(JSUI.isPhotoshop)
	{
		  var d = new ActionDescriptor();
		  d.putEnumerated(sTID('state'), sTID('state'), sTID('redrawComplete'));
		  return executeAction(sTID('wait'), d, DialogModes.NO);
	}
	else
	{
		return;
	}
};

// this returns full active document path without building a histogram + bypasses the 'document not yet saved' exception)
JSUI.getDocumentFullPath = function()
{
	if(app.documents.length)
	{
		if(JSUI.isPhotoshop)
		{		
			var ref = new ActionReference();
			ref.putProperty(cTID('Prpr'), cTID('FilR'));
			ref.putEnumerated(cTID('Dcmn'), cTID('Ordn'), cTID('Trgt'));
			var desc = executeActionGet(ref);
			return desc.hasKey(cTID('FilR')) ? desc.getPath(cTID('FilR')) : undefined;
		}
		else if(JSUI.isIllustrator)
		{
			var docFullPath = app.activeDocument.fullName;
			// var docFullPathURIMatchesSystem = docFullPath.toString().match( app.path) != null;
			// on macOS getting fullName for "Untitled-1" Illustrator document that has not yet been saved to disk returns "/Untitled-1" 
			var docFullPathURIMatchesSystem = JSUI.isWindows ? (docFullPath.toString().match( app.path) != null) : (docFullPath.toString() == ("/" + app.activeDocument.name));


			return docFullPathURIMatchesSystem ? undefined : docFullPath;
		}
		else
		{
			return;
		}
	}
};

//
// get recent files / workspace files management



// get workspaces JSON files from location
JSUI.getWorkspaces = function( uri )
{
    var workspacesFolder = new Folder(uri);
    var files = [];

    if(workspacesFolder.exists)
    {
        files = workspacesFolder.getFiles(/\.(json)$/i);
    }
    return files;
}

// wrapper for getting workspaces from default location
JSUI.getProjectWorkspaces = function( uri )
{
                        // {Folder.userData}/geeklystrips/Default/workspaces 
    var workspacesFolder = new Folder( uri ? uri : (JSUI.WORKSPACESFOLDER) );
    var workspaceFiles = JSUI.getWorkspaces(workspacesFolder);
    return workspaceFiles;
}

//
JSUI.getWorkspaceObject = function( workspaceFile )
{
    var obj;
    var workspaceFile = new File( workspaceFile );

    if( workspaceFile.exists )
    {  
        var str = JSUI.readFromFile(workspaceFile, "utf8");
        obj = JSON.parse(str);
    }
    if($.level) $.writeln(obj);

    return obj;
}

JSUI.getWorkspaceObjList = function( uri )
{
    var files = [];

    // hack to accept an array of prefiltered files as uri
    if( !(uri instanceof Folder))
    {
        // test for array
        if(typeof uri == "object")
        {
            if(uri.length)
            {
                files = uri;
            }
        }
    }

    var uri = new Folder( uri ? uri : (JSUI.WORKSPACESFOLDER) );
    var objList = [];
    files = files.length ? files : JSUI.getProjectWorkspaces(uri);

    for(var i = 0; i < files.length; i++)
    {
        var obj = JSUI.getWorkspaceObject(files[i]);

        if(obj)
        {
            objList.push(obj);
        }
    }

    return objList;
}

JSUI.createWorkspace = function( name, filesList )
{
    var obj = {};
    obj.name = name;
    obj.appName = app.name;
    obj.documents = [];

    for(var i = 0; i < filesList.length; i++)
    {
        obj.documents.push(filesList[i]);
    }

    return obj;
}

JSUI.saveWorkspace = function( uri, workspaceObj )
{
    var saved = false;
    if(uri && workspaceObj)
    {
        saved = JSUI.writeToFile( uri, JSON.stringify(workspaceObj, null, "\t"), "utf8" );
    }
    return saved ? new File(uri) : false;
}

JSUI.createAndSaveWorkspace = function( name, uri, filesArr )
{
    var uri = new File( uri ? uri : (JSUI.WORKSPACESFOLDER + "/" + name + ".json") );

    var obj = JSUI.createWorkspace( name, filesArr );
    var saved = JSUI.saveWorkspace( uri, obj );
    return saved;
}

JSUI.getWorkspaceDocuments = function(workspaceUri)
{
    var docsArr = [];
    var obj = JSUI.getWorkspaceObject(workspaceUri);
    if(obj)
    {
        docsArr = obj.documents;
    }
    return docsArr;
}

JSUI.createWorkspaceFromActiveDocuments = function( name, uri)
{
    var tempFileName = "DefaultName";

    if(app.documents.length)
    {
        if(!name)
        {
            if(!uri)
            {
                return;
            }
            tempFileName = new File(uri).name.replace(".json", "");
        }

        var name = name ? name : tempFileName;
        
        var newUri = new File( uri ? uri : (JSUI.WORKSPACESFOLDER + "/" + name + ".json") );

        var appDocs = [];
        for(var i = 0; i < app.documents.length; i++)
        {
            appDocs.push(app.documents[i].fullName.toString());
        }    

        uri = JSUI.createAndSaveWorkspace( name, newUri, appDocs );
    }
    else
    {
        uri = false;
    }
    return uri;
}

JSUI.openWorkspaceDocuments = function(workspaceUri)
{
    var obj = JSUI.getWorkspaceObject(workspaceUri);

    if(obj)
    {
        var documents = obj.documents;

        // check for obj.appName ?
        if(documents.length)
        {
            for(var i = 0; i < documents.length; i++)
            {
                var doc = new File(documents[i]);
                
                if(doc.exists)
                {
                    app.open(doc);
                }
                else
                {
                    alert("File could not be found:\n\n" + doc.fsName );
                }
    
            }
        }
    }
}


    ///////////////


// get list of recent documents 
JSUI.getMixedFiles = function( n )
{
    var n = n ? n : (JSUI.isIllustrator ? 30 : 100); 
    var files = [];

    for(var i = 0; i < n; i++)
    {
		// from Illustrator's preferences
        var file = JSUI.isIllustrator ? app.preferences.getStringPreference("plugin/MixedFileList/file"+i+"/path") : app.recentFiles[i];
        if(file == "") break;
        else
        {
            files.push(file);
        }
    }
    return files;
}
    
JSUI.openRecentFile = function ( showListBool, num )
{
    var showListBool = showListBool ? showListBool : false;
    var num = num ? num : (JSUI.isIllustrator ? 30 : 100);

    if(showListBool)
    {
        var recentFiles = JSUI.getMixedFiles(num);
    }
    else
    {
        // just open last file in history
        var mostRecentFile = new File(JSUI.isIllustrator ? app.preferences.getStringPreference("plugin/MixedFileList/file0/path") : app.recentFiles[0]);
        if(mostRecentFile.exists)
        {
            app.open(mostRecentFile);
        }
    }
}

//


// set layer palette's object color 
JSUI.setLayerObjectColor = function( color )
{
	if(JSUI.isPhotoshop)
	{		
		if(!color) color = "None";

		if(color == "red") color = "Rd  "; 
		else if(color == "blue") color = "Bl  "; 
		else if(color == "orange") color = "Orng"; 
		else if(color == "yellow") color = "Ylw "; 
		else if(color == "green") color = "Grn "; 
		else if(color == "violet") color = "Vlt "; 
		else if(color == "gray") color = "Gry "; 
		else if(color == "none") color = "None";
	
		var desc27 = new ActionDescriptor();
		var ref3 = new ActionReference();
		ref3.putEnumerated( charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt') );
		desc27.putReference( charIDToTypeID('null'), ref3 );
		var desc28 = new ActionDescriptor();
		desc28.putEnumerated( charIDToTypeID('Clr '), charIDToTypeID('Clr '), charIDToTypeID(color) );
		desc27.putObject( charIDToTypeID('T   '), charIDToTypeID('Lyr '), desc28 );
		executeAction( charIDToTypeID('setd'), desc27, DialogModes.NO );
		return true;
	}
	else
	{
		return;
	}
};

// "controlled" randomization, float sticks around a specified threshold
JSUI.randomizeFloat = function( num, max, range )
{
	if(range == 0) return num; 
	if(range > 1) range = 1;
	var random = Math.random();
	var flux = range * ( num * random );

	flux = ( random < 0.5 ? (-flux) : flux);
	flux = parseInt( num + flux);
	flux = flux < 0 ? 0 : flux > max ? max : flux;
	// JSUI.quickLog(flux, "randomised: ");
	return flux;
}

//
// misguided attempt at randomizing r, g, b values of color object 
// while remaining within a specific hue range
// achieving this with HSL/HSB would be a lot easier
//
// rangeFloat default is 0, full randomization across a range of 0-255 for each r, g, b component
// 0.04 yields difficult to see but actual variations in color
// a value between 0.75 and 1.0 should be clearly visible
//
JSUI.randomizeRGBColor = function( hexStr, rangeFloat )
{
	if(hexStr == "transparent") return hexStr;
	if(hexStr == undefined) hexStr = "000000";
	if(rangeFloat == undefined) rangeFloat = 0;
	if(rangeFloat instanceof Boolean) rangeFloat =  (rangeFloat ? 0.0 : 0.0000001);
	if(rangeFloat > 1) rangeFloat = 1;

	// if object, assume color fill
	if(typeof hexStr == "object")
	{
		if(JSUI.isPhotoshop)
		{	
			hexStr = hexStr.rgb.hexValue;
		}
		else if(JSUI.isIllustrator)
		{
			// hexStr = JSUI.HexToR(hexStr)+JSUI.HexToG(hexStr)+JSUI.HexToB(hexStr);			
			var colObj = hexStr;
			hexStr = JSUI.toHex(colObj.red)+JSUI.toHex(colObj.green)+JSUI.toHex(colObj.blue);			
		}
	}

	var r,g,b = 0;

	if(JSUI.isPhotoshop)
	{		
		var c = new SolidColor();
		c.rgb.hexValue = hexStr;

		r = c.rgb.red;
		g = c.rgb.green;
		b = c.rgb.blue;
	}
	else if(JSUI.isIllustrator)
	{
		var c = JSUI.hexToRGBobj(hexStr)

		r = c.red;
		g = c.green;
		b = c.blue;
	}

	// JSUI.quickLog([ r, g, b ], "\n"+hexStr.toUpperCase());

	// proceed with randomization
	if(rangeFloat > 0)
	{
		r = JSUI.randomizeFloat(r, 255, rangeFloat);
		g = JSUI.randomizeFloat(g, 255, rangeFloat);
		b = JSUI.randomizeFloat(b, 255, rangeFloat);
		// JSUI.quickLog([ r, g, b ], " randomized @ " + rangeFloat);
	} 
	else
	{
		// fully random RGB
		r = Math.round(Math.random()*255);
		g = Math.round(Math.random()*255);
		b = Math.round(Math.random()*255);
		// JSUI.quickLog([ r, g, b ], " full randomized: " + rangeFloat);
	}

	if(JSUI.isPhotoshop)
	{
		c.rgb.red = r;
		c.rgb.green = g;		
		c.rgb.blue = b;

		return c;
	}
	else if	(JSUI.isIllustrator)
	{
		c.red = r;
		c.green = g;
		c.blue = b;
		// JSUI.quickLog(c);
		return c;
	}
	else
	{
		return;
	}
};

// RGB hex functions

// get array of normalized values from hex string
// "#f760e3" becomes [0.96862745098039,0.37647058823529,0.89019607843137,1];

// JSUI.hexToRGB = function (hex)
// {
// 	var color = hex.trim().replace('#', '');
// 	var r = parseInt(color.slice(0, 2), 16) / 255;
// 	var g = parseInt(color.slice(2, 4), 16) / 255;
// 	var b = parseInt(color.slice(4, 6), 16) / 255;
// 	return [r, g, b, 1];
// };

JSUI.hexToRGB = function (hex)
{
	if(hex instanceof Array) return hex;
	var color = hex.trim().replace('#', '');
	var r = parseInt(color.slice(0, 2), 16) / 255;
	var g = parseInt(color.slice(2, 4), 16) / 255;
	var b = parseInt(color.slice(4, 6), 16) / 255;
	var a = 1.0;
	if(color.length == 8) a = parseInt(color.slice(6, 8), 16) / 255;
	return [r, g, b, a];
};


// hex string to Photoshop/Illustrator color object
JSUI.hexToRGBobj = function ( hexStr )
{
    var hex = hexStr != undefined ? hexStr : "000000";
	hex = hex.trim().replace('#', '');

	// illustrator does not have a direct hexValue property
	if(JSUI.isIllustrator)
	{
		var color = new RGBColor();
		color.red = JSUI.HexToR(hex);
		color.green = JSUI.HexToG(hex);
		color.blue = JSUI.HexToB(hex);
		return color;
	}
	else if(JSUI.isPhotoshop)
	{
		var color = new SolidColor();
		color.rgb.hexValue = hex;
		return color;
	}

    return;
};

// RGB values to hexadecimal string: (255, 0, 128) becomes "FF0080"
JSUI.RGBtoHex = function(r, g, b, a)
// JSUI.RGBtoHex = function(r, g, b)
{
	return JSUI.toHex(r) + JSUI.toHex(g) + JSUI.toHex(b) + (a != undefined ? JSUI.toHex(a) : "")
	// return JSUI.toHex(r) + JSUI.toHex(g) + JSUI.toHex(b);
	// return ((1<<24)+(r<<16)+(g<<8)+b).toString(16).toUpperCase().slice(1);
};

// Number to hex string (128 becomes "80")
JSUI.toHex = function(n)
{
	// if (n == null) return "00";
	// n = parseInt(n); 
	// if (n == 0 || isNaN(n)) return "00";
	// n = Math.max(0, n); 
	// n = Math.min(n, 255); 
	// // n = Math.round(n);
	// return "0123456789ABCDEF".charAt((n-n%16)/16) + "0123456789ABCDEF".charAt(n%16);

	if (n == 0 || n == null || n == undefined || isNaN(n)) return "00";
	if(isNaN(n)) n = parseInt(n);
	// n = Math.max(0, Math.min(Math.round(n), 255));
	n = Math.max(0, Math.min(n, 255));
	// n = Math.max(0, n); 
	// n = Math.min(n, 255); 
	// n = Math.round(n);

	return ((1<<8)+n).toString(16).toUpperCase().slice(1);
};

// convert color object to usable hex string 
// compensates for Illustrator's lack of .hexValue property
JSUI.colorFillToHex = function(color)
{
	if(color == undefined) return "000000";
	if(typeof color != "object") return "000000";

	if(JSUI.isIllustrator)
	{
		return JSUI.toHex(color.red) + JSUI.toHex(color.green) + JSUI.toHex(color.blue);
	}
	else if(JSUI.isPhotoshop)
	{
		return color.rgb.hexValue;
	}
}

JSUI.cutHex = function(h)
{
	if(h.charAt(0)=="#") h = h.substring(1,7); 
	else if(h.charAt(0)=="0" && h.charAt(1)=="x") h = h.substring(2,8); return h;
};

JSUI.HexToR = function(h) 
{
	return parseInt((JSUI.cutHex(h)).substring(0,2), 16);
};

JSUI.HexToG = function(h) 
{
	return parseInt((JSUI.cutHex(h)).substring(2,4), 16);
};

JSUI.HexToB = function(h)
{
	return parseInt((JSUI.cutHex(h)).substring(4,6), 16);
};

JSUI.HexToA = function(h)
{
	return parseInt((JSUI.cutHex(h)).substring(6,8), 16);
};

// decode Base64 string (binary data represented as ASCII string)
JSUI.decode64 = function(input)
{
	if(!input) return;

    var keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var result = "";
    var c1, c2, c3 = "";
    var e1, e2, e3, e4 = "";
    var i = 0;
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    do {
        e1 = keys.indexOf(input.charAt(i++));
        e2 = keys.indexOf(input.charAt(i++));
        e3 = keys.indexOf(input.charAt(i++));
        e4 = keys.indexOf(input.charAt(i++));
        c1 = (e1 << 2) | (e2 >> 4);
        c2 = ((e2 & 15) << 4) | (e3 >> 2);
        c3 = ((e3 & 3) << 6) | e4;
        result = result + String.fromCharCode(c1);
        if (e3 != 64) {result = result + String.fromCharCode(c2);}
        if (e4 != 64) {result = result + String.fromCharCode(c3);}
        c1 = c2 = c3 = "";
        e1 = e2 = e3 = enc4 = "";
    } while (i < input.length);
    return result;
};


//
//
// https://github.com/douglascrockford/JSON-js

//  json2.js
//  2017-06-12
//  Public Domain.
//  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

//  USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
//  NOT CONTROL.

//  This file creates a global JSON object containing two methods: stringify
//  and parse. This file provides the ES5 JSON capability to ES3 systems.
//  If a project might run on IE8 or earlier, then this file should be included.
//  This file does nothing on ES5 systems.

//      JSON.stringify(value, replacer, space)
//          value       any JavaScript value, usually an object or array.
//          replacer    an optional parameter that determines how object
//                      values are stringified for objects. It can be a
//                      function or an array of strings.
//          space       an optional parameter that specifies the indentation
//                      of nested structures. If it is omitted, the text will
//                      be packed without extra whitespace. If it is a number,
//                      it will specify the number of spaces to indent at each
//                      level. If it is a string (such as "\t" or "&nbsp;"),
//                      it contains the characters used to indent at each level.
//          This method produces a JSON text from a JavaScript value.
//          When an object value is found, if the object contains a toJSON
//          method, its toJSON method will be called and the result will be
//          stringified. A toJSON method does not serialize: it returns the
//          value represented by the name/value pair that should be serialized,
//          or undefined if nothing should be serialized. The toJSON method
//          will be passed the key associated with the value, and this will be
//          bound to the value.

//          For example, this would serialize Dates as ISO strings.

//              Date.prototype.toJSON = function (key) {
//                  function f(n) {
//                      // Format integers to have at least two digits.
//                      return (n < 10)
//                          ? "0" + n
//                          : n;
//                  }
//                  return this.getUTCFullYear()   + "-" +
//                       f(this.getUTCMonth() + 1) + "-" +
//                       f(this.getUTCDate())      + "T" +
//                       f(this.getUTCHours())     + ":" +
//                       f(this.getUTCMinutes())   + ":" +
//                       f(this.getUTCSeconds())   + "Z";
//              };

//          You can provide an optional replacer method. It will be passed the
//          key and value of each member, with this bound to the containing
//          object. The value that is returned from your method will be
//          serialized. If your method returns undefined, then the member will
//          be excluded from the serialization.

//          If the replacer parameter is an array of strings, then it will be
//          used to select the members to be serialized. It filters the results
//          such that only members with keys listed in the replacer array are
//          stringified.

//          Values that do not have JSON representations, such as undefined or
//          functions, will not be serialized. Such values in objects will be
//          dropped; in arrays they will be replaced with null. You can use
//          a replacer function to replace those with JSON values.

//          JSON.stringify(undefined) returns undefined.

//          The optional space parameter produces a stringification of the
//          value that is filled with line breaks and indentation to make it
//          easier to read.

//          If the space parameter is a non-empty string, then that string will
//          be used for indentation. If the space parameter is a number, then
//          the indentation will be that many spaces.

//          Example:

//          text = JSON.stringify(["e", {pluribus: "unum"}]);
//          // text is '["e",{"pluribus":"unum"}]'

//          text = JSON.stringify(["e", {pluribus: "unum"}], null, "\t");
//          // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

//          text = JSON.stringify([new Date()], function (key, value) {
//              return this[key] instanceof Date
//                  ? "Date(" + this[key] + ")"
//                  : value;
//          });
//          // text is '["Date(---current time---)"]'

//      JSON.parse(text, reviver)
//          This method parses a JSON text to produce an object or array.
//          It can throw a SyntaxError exception.

//          The optional reviver parameter is a function that can filter and
//          transform the results. It receives each of the keys and values,
//          and its return value is used instead of the original value.
//          If it returns what it received, then the structure is not modified.
//          If it returns undefined then the member is deleted.

//          Example:

//          // Parse the text. Values that look like ISO date strings will
//          // be converted to Date objects.

//          myData = JSON.parse(text, function (key, value) {
//              var a;
//              if (typeof value === "string") {
//                  a =
//   /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
//                  if (a) {
//                      return new Date(Date.UTC(
//                         +a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]
//                      ));
//                  }
//                  return value;
//              }
//          });

//          myData = JSON.parse(
//              "[\"Date(09/09/2001)\"]",
//              function (key, value) {
//                  var d;
//                  if (
//                      typeof value === "string"
//                      && value.slice(0, 5) === "Date("
//                      && value.slice(-1) === ")"
//                  ) {
//                      d = new Date(value.slice(5, -1));
//                      if (d) {
//                          return d;
//                      }
//                  }
//                  return value;
//              }
//          );

//  This is a reference implementation. You are free to copy, modify, or
//  redistribute.

/*jslint
    eval, for, this
*/

/*property
    JSON, apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== "object") {
    JSON = {};
}

(function () {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        // Format integers to have at least two digits.
        return (n < 10)
            ? "0" + n
            : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? (
                    this.getUTCFullYear()
                    + "-"
                    + f(this.getUTCMonth() + 1)
                    + "-"
                    + f(this.getUTCDate())
                    + "T"
                    + f(this.getUTCHours())
                    + ":"
                    + f(this.getUTCMinutes())
                    + ":"
                    + f(this.getUTCSeconds())
                    + "Z"
                )
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                    ? c
                    : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\""
            : "\"" + string + "\"";
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (
            value
            && typeof value === "object"
            && typeof value.toJSON === "function"
        ) {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":

// JSON numbers must be finite. Encode non-finite numbers as null.

            return (isFinite(value))
                ? String(value)
                : "null";

        case "boolean":
        case "null":

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce "null". The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is "object", we might be dealing with an object or an array or
// null.

        case "object":

// Due to a specification blunder in ECMAScript, typeof null is "object",
// so watch out for that case.

            if (!value) {
                return "null";
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === "[object Array]") {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? "[]"
                    : gap
                        ? (
                            "[\n"
                            + gap
                            + partial.join(",\n" + gap)
                            + "\n"
                            + mind
                            + "]"
                        )
                        : "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== "function") {
        meta = {    // table of character substitutions
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = "";
            indent = "";

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === "string") {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== "function" && (
                typeof replacer !== "object"
                || typeof replacer.length !== "number"
            )) {
                throw new Error("JSON.stringify");
            }

// Make a fake root object containing our value under the key of "".
// Return the result of stringifying the value.

            return str("", {"": value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return (
                        "\\u"
                        + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
                    );
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with "()" and "new"
// because they can cause invocation, and "=" because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
// replace all simple value tokens with "]" characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or "]" or
// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The "{" operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval("(" + text + ")");

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError("JSON.parse");
        };
    }
}());

// DEBUG AREA

if($.level)
{
	// let's confirm that the file was properly included
	$.writeln("\nJSUI.js v" + JSUI.version + " with json2 successfully loaded by " + app.name + " " + app.version);
}
//EOF
