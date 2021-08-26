/* 
	JSUI Extendscript Dialog Library for Photoshop
	Framework by geeklystrips@github
		
	0.5.5: renamed from UI to JSUI to avoid namespace conflicts
	0.6.2: fix for disappearing iconbutton images: ScriptUI.newImage(imgPath, imgPath, imgPath, imgPath)
	0.8: better support for iconbutton states (radiobutton/checkbox) + up/over/down button image states
	0.85: improved JSUI.debug() behavior, fixed issues with addToggleIconButton update method, added JSUI.autoSave feature
	0.87: adding dark UI support for Photoshop CS6
	0.88: using custombutton type + mouseevents to better control ScriptUI iconbutton visuals in CS6, added onClickFunction support for addCheckBox & addRadioButton
	0.89: fixed a bug with dropdownlist component, becase JSUI.fromIniString() was returning the index value as a string
	0.90: Added JSUI.getScriptUIStates() and JSUI.addImageGrid()
	0.902: fixed bug with JSUI.addBrowseForFolder() / JSUI.addBrowseForFile()
	0.91: added open file / save file logic + file type filter option to JSUI.addBrowseForFile(), added 'grid' variable to container's list of variables in JSUI.addImageGrid(), added JSUI.addBrowseForFileReplace();
	0.92: improved placeholder object specs behavior
	0.93: added support for updating toggleIcon states from usage context, made ReadingFrom/WritingTo INIstring print output optional
	0.94: added JSUI.matchObjectArrayIndex()

	0.95: 
		- added JSUI.addIconButton()
		- added JSUI.createDialog()
		- added JSUI.alert()
		- added JSUI.confirm()
		- added JSUI.prompt()
		- added JSUI.setLayerObjectColor()
		- JSUI.scriptUIstates() now accessible without JSUI.populateINI())

	0.96:
		- added JSUI.getCurrentTheme() & added JSUI.getBackgroundColor() + default brightness values for automated styling of Photoshop CS6 dialogs
		- support for inherent light/dark theme graphics as part of JSUI.scriptUIstates()

	0.965:
		- JSUI.alert() now "column"-oriented by default (CS6)
		- added JSUI.hexToRGB()
		- added { style: "toolbutton" } property to addIconButton and addToggleIconButton to avoid outlines and shadows on iconbuttons in CS6 
		- added JSUI.CS6styling boolean (true by default, false will deactivate all attempts at matching CS6 light/dark foreground/background matching)
		- added JSUI.getRelativePath() routine to JSUI.scriptUIstates() to support "../../img/image.png"
		- fixed scriptUIstates onMouseOver issue with CS6 for JSUI.addButton()

	0.968:
		- added check for string arrays to JSUI.matchObjectArrayIndex() (would previously return the first object array index)
		- JSUI.addButton() now updates its own visuals on creation
		- fixed JSUI.is_x64 logic (displayed x32 on macOS)

	0.969:
		- fixed JSUI.addButton.update() issue
		- JSUI.addButton() now also uses {style: "toolbutton"} creation properties when fed image resource
		- improvements to JSUI.alert/confirm/prompt dialogs: fallbacks to default system behavior added 

	0.97:
		- added JSUI.status object for displaying progress if needed
			- JSUI.status.increment( 0.01 ) means +1%
			- adapted JSUI.debug() to display JSUI.status.message and JSUI.status.progress.

	0.971: 
		- added JSUI.status.percent (String)

	0.972: 
		- added support for palette mode to JSUI.createDialog()
		- added debug and refresh booleans to addProgressBar.update()

	0.975
		- added basic Illustrator support
		- added onChangingFunction support to JSUI.addBrowseForFolder() && JSUI.addEditText()
		- improved obj.imgFile support, JSUI.addButton() now looks for "imgNameStr.png"
		- added built-in support for "img/" JSUI.scriptUIstates()
		- added functions for returning next/previous multiples of x

	0.976
		- added JSUI.addBrowseForFolderWidget() with built-in fixed location widget/presets
		- tweaks to mults of x / powers of 2 function

	0.977 
		- added drawRectangle()
		- tweaked addBrowseForFolderWidget()
		- tweaked addEditText() 
			- made onChangingFunction also accessible for non-file object fields
			- made empty strings possible
			- added option to bypass prefs update (fix for issue with addBrowseForFolderWidget())
		- tweaked addDropDownList with obj.onChangedFunction
		- added JSUI.launchURL() + basic inline .url property for addButton()

	0.978
		- tweaks to addBrowseForFolderWidget
			- warning message for unsaved document (forces fixed expath location) 
		- fixes for CS6 styling colors, oops.
		- added JSUI.message() + JSUI.showInfo() for referring user to specific documentation
		- added JSUI.randomizeRGBColor() for generating fully random colors (customizable range)

	0.9783
		- added support for directly passing scriptUIstates objects as inlined obj.imgFile to most visual component constructors
		- edittext component now has default preferredSize width of 300 
		- added "system" addColorPicker() widget component
		- added JSUI.writeProperty() to allow writing single property value to custom file (independant of JSUI.PREFS)
		- added addToggleIconGroup() to internally handle arrays of toggle iconbuttons
		- tweaked addToggleIconButton() 
			- support for missing images (will now fall back to regular radiobuttons/checkboxes)
			- support for ignoring the creation of prefs properties (ToggleIconButton components that are used as containers for a complex widget like addImageGrid)

	0.9785
		- added Illustrator support to JSUI.getDocumentFullPath()

	0.9786
		- adding JSUI.is2020andAbove boolean
		- adding image dependencies
			img/PhotoshopCS6_96px.png	#87c1fb, #09004f
			img/PhotoshopCC_96px.png	#26c9ff, #061e26, #d9f5ff,  #ffffff
			img/IllustratorCC_96px.png	#
			// Ps 2020+		#31a8ff, #001e36, #ffffff
			// Ai 2020+ 	#ff9a00, #330000, #ffffff

			img/placeholder.png
			img/Info_48px.png
			img/SaveSettings.png
			img/WarningSign_48px.png
			img/WarningSign.png
			img/Info_48px.png

		- adding Illustrator support to JSUI.prompt()
		- bugfix/workaround for JSUI.createDialog() to simulate imageSize array in cases where image file does not exist
		- workaround for addImage() to actually display invalid URI message instead of crashing
		- addEditText() fix for width vs characters property in a context where the parent container has alignChildren set to "fill"

	TODO
	- colorPicker hexString TextEdit should have support for an onChangingFunction (?)
	- support for hybrid ToggleIconButton component fallback to radiobuttons (if one image is missing instead of all images for radiobuttons)
	- method for getting which property from toggleiconbutton array is activated
	- JSUI needs a method for standalone properties that do not need to be saved to INI
		- bypass based on provided array of strings during toINIstring process?
	- make imgFile target accept arrays to bypass default naming scheme (if typeof imgFile == "object" && imgFile.length != undefined) or (if imgFile instanceof...)
	- Scrollable alert support for cases with overflowing content
	- Better support for JSUI.addImageGrid() types (only supports arrays of strings for now)
	- save settings to / read from XML / JSON

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

/* persistent namespace	*/
JSUI = function(){}; 

/* version	*/
JSUI.version = "0.9786";

// do some of the stuff differently depending on $.level and software version
JSUI.isESTK = app.name == "ExtendScript Toolkit";
JSUI.isPhotoshop = app.name == "Adobe Photoshop";
JSUI.isIllustrator = app.name == "Adobe Illustrator";
JSUI.isCS6 = JSUI.isPhotoshop ? app.version.match(/^13\./) != null : false; // photoshop-specific
JSUI.is2020andAbove = JSUI.isPhotoshop ? (parseInt(app.version.match(/^\d.\./)) >= 21) : (parseInt(app.version.match(/^\d.\./)) >= 24); 


/*	 system properties	*/
JSUI.isWindows = $.os.match(/windows/i) == "Windows";
JSUI.isWin7 = $.os.match(/windows/i) == "Windows" ? $.os.match(" 6.1 Service Pack ") != null : false;
JSUI.isWin10 = $.os.match(/windows/i) == "Windows" ? $.os.match(" 6.2 Service Pack ") != null : false;
JSUI.is_x64 = JSUI.isWindows ? BridgeTalk.appVersion.match(/\d\d$/) == '64' : true;

JSUI.TOOLNAME = "DEFAULTNAME";
JSUI.TOOLDISPLAYNAME = JSUI.TOOLNAME;

/*	This kind of data is frequently stored in ~/Library/Application Support.
	User-specific settings are frequently stored in ~/Library/Preferences
	Folder.appData = global, system preferences on OSX. Depending on user rights, applications might have trouble writing to this location.	
	Folder.userData = roaming data
	
JSUI.USERPREFSFOLDER = (JSUI.isWindows ? Folder.appData : "~/Library/Application Support");
JSUI.USERPREFSFOLDER = (JSUI.isWindows ? Folder.userData : "~/Library/Application Support");

// OSX user library:			/Users/username/Library/Application Support
var userData = prompt("Folder.userData value:", userData.fsName);

// OSX system library		  /Library/Application Support
//~ var appData = prompt("Folder.appData value:", appData.fsName);

	*/
//~ JSUI.USERPREFSFOLDER = (JSUI.isWindows ? "~" : "~/Library/Application Support");
JSUI.USERPREFSFOLDER = Folder.userData;
JSUI.TOOLSPREFSFOLDERNAME = "pslib";
JSUI.INIFILE = JSUI.USERPREFSFOLDER + "/" + JSUI.TOOLSPREFSFOLDERNAME + "/" + JSUI.TOOLNAME + ".ini";
JSUI.autoSave = false;
JSUI.PrintINIstringInfo = false;
JSUI.CS6styling = true;

// this must be invoked for JSUI.INIFILE to be valid
JSUI.populateINI = function()
{
	JSUI.INIFILE = new File(JSUI.USERPREFSFOLDER + "/" + JSUI.TOOLSPREFSFOLDERNAME + "/" + JSUI.TOOLNAME + ".ini");
	// JSUI.status.message = "JSUI init OK";
	JSUI.status.message = "";
	return JSUI.INIFILE.exists;
}

/* INI prefs framework	*/
JSUI.PREFS = {};
JSUI.status = { progress: 0, percent: "0%", message: "" };

/*  Layout and graphics  */
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

/* failsafe for cases where the UI framework is used without a debugTxt dialog component	
 if this variable is not replaced, calls by regular functions to modify its state should not cause problems	*/
var debugTxt = {};

JSUI.getScriptFile = function()
{
	var path = $.fileName;
	return new File(path);
};

/* these functions return specs relative to JSUI.js (unless included files are flattened)	*/
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

/*
 these should also use encodeURI/decodeURI
 convert URL to URI	"C:\\Program Files\\Adobe" becomes "file:///C|/Program%20Files/Adobe" */
JSUI.url2uri = function(url) 
{
	var uri = url.toString().replace(":", "|");
	uri = uri.replace(/\\/g, "/");
	uri = uri.replace(/ /g, "%20");
	uri = "file:///" + uri;
	return uri;
};

/* convert URI to URL	"file:///C:/Program%20Files/Adobe" becomes "C:\Program Files\Adobe"	*/
JSUI.uri2url = function(uri) 
{
	var url = uri.toString().substring(8);
	url = url.replace(/\//g, "\\");
	url = url.replace("|", ":");
	url = url.replace(/%20/g, " ");
	return url;
};

/* convert file system name to URI	"C:\Program Files\Adobe" becomes "c/Program Files/Adobe"	*/
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

/* convert URI name to file system name	"c/Program Files/Adobe" becomes "C:\Program Files\Adobe"	*/
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
		var u = new File(Folder.temp + '/JSUITmpURL.url');
		u.open('w');
		u.writeln('[InternetShortcut]\nURL=' + url + '\n');
		u.close();
		u.execute();
		u.remove(); 
	}
	catch(e)
	{  
		alert(e);
	} 
};


/* print object properties to javascript console	*/
JSUI.reflectProperties = function(obj, msg)
{
	if(msg && $.level)
	{
		$.writeln(msg);
	}
	
	var str = "";
	
	var props = obj.reflect.properties;
	
	/*Loop through object's properties	*/
	for (var i in props)
	{
		var val = props[i];
		
		if(val == "__proto__" || val == "__count__" || val == "__class__" || val == "reflect" || val == "Components" || val == "typename")
		{
			continue;
		}
	
/*		if(typeof obj[val] == "string")
		{
			quotes += "\"";
		}	*/
	
		str += "\t" + val + ":\t\t" + obj[val] + "\t\t[" + typeof obj[val] + "]\n";
	/*	if($.level) $.writeln(msg);
		str+=msg	*/
	}
	if($.level) $.writeln(str);
	return str;
};

/* UI debug function (with ExtendScript Toolkit only)	*/
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

/* glyph to unicode	*/
JSUI.getUnicode = function(str)
{
	var c = null;
	if(str != "" && str != null)
	{
		c = str.charCodeAt(0); /*	 "@" becomes 64 (number)	*/
		c = c.toString(16).toUpperCase();  /* 64 becomes "40" (number converted to string with base 16)	*/
		c = JSUI.zeropad(c);
	}
	return c;
};

/* unicode to glyph	*/
JSUI.getChar = function(num)
{
	var str = null;
	if(!isNaN(num))
	{
		str = String.fromCharCode(num);
	}
	return str;
};

// pads numbers that don't have a minimum of 4 digits
JSUI.zeropad = function(str)
{
	/* padding string with zeroes	*/
	return (str.length < 2 ? "000" + str :  (str.length < 3 ? "00" + str : (str.length < 4 ? "0" + str : (str) ) ) ); // 40 becomes "0040"
};

// // pads hex numbers that don't have a minimum of 6 digits
// JSUI.sixzeropad = function(str)
// {
// 	/* padding string with zeroes	*/
// 	return ( ( (str.length < 2 ? "00000" + str :  (str.length < 3 ? "0000" + str : (str.length < 4 ? "000" + str : (str) ) ) ) ) ); // CC becomes "0000CC"
// };

// with help from Davide
// *bows*
JSUI.getCurrentTheme = function()
{
	if(JSUI.isPhotoshop)
	{
		try
		{
			var ref = new ActionReference();
			ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("interfacePrefs"));
			ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
			var desc = executeActionGet(ref).getObjectValue(stringIDToTypeID("interfacePrefs"));
			return typeIDToStringID(desc.getEnumerationValue(stringIDToTypeID("kuiBrightnessLevel")));
		}
		catch(e)
		{
			return "kPanelBrightnessMediumGray";
		}
	}
	else
	{
		return "kPanelBrightnessMediumGray";
	}
};

JSUI.getBackgroundColor = function()
{
	var currentTheme = JSUI.getCurrentTheme();

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
};

JSUI.backgroundColor = JSUI.getBackgroundColor();

JSUI.createDialog = function( obj )
{
	var obj = obj != undefined ? obj : {};

	obj.title = obj.title != undefined ? obj.title : "JSUI Dialog Window";
	obj.systemInfo = obj.systemInfo != undefined ?  ( obj.systemInfo ? (JSUI.is_x64 ? " x64" : " x32") : "" ) : "";
	obj.extraInfo = obj.extraInfo != undefined ? obj.extraInfo : "";

	obj.debugInfo = obj.debugInfo != undefined ? obj.debugInfo : false;
	// obj.closeButton = obj.closeButton != undefined ? obj.closeButton : false;

	obj.alert = obj.alert != undefined ? obj.alert : false;
	obj.confirm = obj.confirm != undefined ? obj.confirm : false;
	obj.prompt = obj.prompt != undefined ? obj.prompt : false;

	obj.palette = obj.palette != undefined ? obj.palette : false;

	var dlg = new Window( obj.palette ? 'palette' : 'dialog', obj.title + obj.systemInfo + "" + obj.extraInfo, undefined, {closeButton:true/*, borderless:true*/});
	if(JSUI.isPhotoshop && JSUI.isCS6 && JSUI.CS6styling) dlg.darkMode();

	dlg.alignChildren = obj.alignChildren != undefined ? obj.alignChildren : "fill";
	dlg.margins = obj.margins != undefined ? obj.margins : 20;
	dlg.spacing = obj.spacing != undefined ? obj.spacing : 15;

	dlg.orientation = obj.orientation != undefined ? obj.orientation : "row";

	// these must be handled after all other properties?
	dlg.preferredSize.width = obj.width != undefined ? obj.width : 600;
	dlg.preferredSize.height = obj.height != undefined ? obj.height : 200;

	//var container = dlg.addRow( { alignChildren: "fill" /*margins: obj.margins ? obj.margins : 15, spacing: obj.spacing != undefined ? obj.spacing : 20 */ } );
	var img = null;
	var imageSize = null;

	// display image?
	if(obj.imgFile)
	{
		var imageContainerSpecs = { margins: obj.margins ? obj.margins : 0, spacing: obj.spacing != undefined ? obj.spacing : 20};
		// var imageContainer = obj.url != undefined ? dlg.addRow( imageContainerSpecs ) : dlg.addColumn( imageContainerSpecs );
		var imageContainer = dlg.addColumn( imageContainerSpecs );
			
		// if URL is provided, let's use app icon
		if(obj.url != undefined)
		{
			obj.imgFile = "/img/" + ( JSUI.isPhotoshop ? "Photoshop" : "Illustrator") + (JSUI.isPhotoshop && JSUI.isCS6 ? "CS6" : "CC" ) + "_96px.png";
			// img = imageContainer.addImage( obj );
		}
		// else
		// {
			img = imageContainer.addImage( obj );
		// }

		// attempt to get image size for layouting
		try
		{
			imageSize = img.image.size;
			imageContainer.preferredSize.width = imageSize[0];
		}
		catch(e)
		{

		}
	}

	var messageContainer = dlg.addColumn( { width: (dlg.preferredSize.width - ( img != null ? imageSize[0] : 0 ) ), alignChildren: "fill", margins: obj.margins ? obj.margins : 0, spacing: obj.spacing != undefined ? obj.spacing : 20} );

	if(obj.message)
	{
		var message = messageContainer.addStaticText( { text: obj.message, multiline: true, alignment: img != null ? "left" : "center" } );
		//message.characters = 75;
	}
	
	//
	// DIALOG WINDOW PROFILES
	//
	// alert status
	if(obj.alert)
	{	
		var buttons = messageContainer.addRow( { spacing: 20 } );

		if(obj.url != undefined)
		{
			buttons.addButton( { imgFile: "img/Info_48px.png", alignment: "right", helpTip: "See documentation:\n\n"+obj.url, url: obj.url } );
		}

		buttons.addCloseButton();

		return dlg;
	}
	// confirm dialog (YES / NO)
	else if(obj.confirm)
	{
		var confirm = null;

		var buttons = messageContainer.addRow( { spacing: 20 } );

		var no = buttons.addButton( { label: "No", name: "cancel", width: 125, height: 44, alignment: "right" });
		var yes = buttons.addButton( { label: "Yes", name: "ok", width: 125, height: 44, alignment: "left" });

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

		dlg.center();

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
		var textfield = messageContainer.add("edittext", undefined, obj.text != undefined ? obj.text : "DEFAULT STRING");
		textfield.characters = obj.characters != undefined ? obj.characters : 35;
		

		var buttons = messageContainer.addRow( { spacing: obj.spacing } );
 		var cancel = buttons.addButton( { label: "Cancel", name: "cancel", width: 125, height: 44, alignment: "right" });
		var ok = buttons.addButton( { label: obj.confirmLabel != undefined ? obj.confirmLabel : "Confirm", name: "ok", onClickFunction: obj.onClickFunction, width: 125, height: 44, alignment: "right" });

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

		dlg.center();

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
			debugButtonsGroup.addDeleteINIButton();
			debugButtonsGroup.addOpenINILocationButton();
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
		var obj = {};
		obj.message = str;
	}
	else if(typeof obj == "object" && (obj instanceof File || obj instanceof Folder))
	{
		var f = obj;
		var obj = {};
		obj.message = f.toString();
	}

	obj.alert = true;
	obj.title = obj.title ? obj.title : ""; //"JSUI Alert Dialog";

	obj.width = obj.width != undefined ? obj.width : 400; 
	obj.height = obj.height != undefined ? obj.height : 150; 

	obj.imgFile = obj.imgFile != undefined ? obj.imgFile : "/img/WarningSign_48px.png";
	
	obj.orientation = "column";
	obj.alignChildren = "left";

	var alertDlg = JSUI.createDialog( obj );

	// either show custom alert window...
	if(alertDlg != undefined)
	{
		alertDlg.center();
		alertDlg.show();
	}
	// ... or fallback to default system stuff 
	else
	{
		alert( obj.message );
	}
};

// softer version of the above function, which is meant as informative more than a warning
JSUI.message = function( messageStr) //, urlStr)
{
	var obj = {};
	// obj.url = urlStr; 

	obj.message = messageStr;
	obj.imgFile = obj.imgFile != undefined ? obj.imgFile : "/img/" + ( JSUI.isPhotoshop ? "Photoshop" : "Illustrator") + (JSUI.isPhotoshop && JSUI.isCS6 ? "CS6" : "CC" ) + "_96px.png";

	JSUI.alert( obj );
};

// informative message + button to launch URL
JSUI.showInfo = function( messageStr, urlStr )
{
	var obj = {};
	obj.message = messageStr;
	obj.imgFile = "/img/Info_48px.png";

	obj.url = urlStr;

	JSUI.alert( obj );
};

// confirm dialog
JSUI.confirm = function( obj )
{
	if(obj == undefined) return null;

	if(typeof obj == "string") 
	{
		var str = obj;
		var obj = {};
		obj.message = str;
	}
	else if(typeof obj == "object" && (obj instanceof File || obj instanceof Folder))
	{
		var f = obj;
		var obj = {};
		obj.message = f.toString();
	}

	obj.confirm = true;
	obj.title = obj.title ? obj.title : "JSUI Confirm Dialog";

	obj.width = obj.width != undefined ? obj.width : 400; 
	obj.height = obj.height != undefined ? obj.height : 200; 

	// obj.imgFile = obj.imgFile != undefined ? obj.imgFile : "/img/Photoshop" + (JSUI.isCS6 ? "CS6" : "CC" ) + "_96px.png";
	obj.imgFile = obj.imgFile != undefined ? obj.imgFile : "/img/" + ( JSUI.isPhotoshop ? "Photoshop" : "Illustrator") + (JSUI.isPhotoshop && JSUI.isCS6 ? "CS6" : "CC" ) + "_96px.png";

	obj.orientation = "column";
	obj.alignChildren = "left";

	try
	{
		var confirmDlg = JSUI.createDialog( obj );
	}
	catch(e)
	{
		return confirm( obj.message, undefined, obj.title );
	}

	// either show custom confirm window...
	if(confirmDlg != undefined)
	{
		return confirmDlg;
	}
	// ... or fallback to default system stuff 
	// else
	// {	
	// 	return confirm( obj.message, undefined, obj.title );
	// }
};

// prompt user
JSUI.prompt = function( obj )
{
	if(obj == undefined) return null;

	if(typeof obj == "string") 
	{
		var str = obj;
		var obj = {};
		obj.message = str;
	}
	else if(typeof obj == "object" && (obj instanceof File || obj instanceof Folder))
	{
		var f = obj;
		var obj = {};
		obj.message = f.toString();
	}

	obj.prompt = true;
	obj.title = obj.title ? obj.title : "JSUI Prompt Dialog";
	obj.text = obj.text ? obj.text : "JSUI Prompt Text";

	obj.width = obj.width != undefined ? obj.width : 500; 
	obj.height = obj.height != undefined ? obj.height : 200; 

	obj.imgFile = obj.imgFile != undefined ? obj.imgFile : "/img/" + (JSUI.isPhotoshop ? "Photoshop" : "Illustrator") + (JSUI.isCS6 ? "CS6" : "CC" ) + "_96px.png";

	obj.orientation = "column";
	obj.alignChildren = "right";

	// var promptDlg = JSUI.createDialog( obj );

	// either show custom confirm window...
// 	if(promptDlg != undefined || promptDlg == null)
// 	{
// 		return promptDlg;
// 	}
// 	// ... or fallback to default system stuff 
// 	else if( promptDlg != null)
// 	{
// 		return prompt( obj.message, obj.text, obj.title );
// 	}
// //
//
try
{
	var promptDlg = JSUI.createDialog( obj );
}
catch(e)
{
	//alert("error!")
	return prompt( obj.message, obj.text, obj.title );
}

// either show custom confirm window...
// if(promptDlg != undefined)
// {
	return promptDlg;
// }




	//return JSUI.createDialog( obj );
};

// this will return a file object for relative "../../img/image.png" if found
JSUI.getRelativePath = function( str )
{
    if(str == undefined) return;

    var scriptFolder = JSUI.getScriptFile().parent;
    var relativePathStr = str;

    var matchesDotDotSlash = relativePathStr.match( /\.\.\//g );
    var hasMatch = matchesDotDotSlash != null;
    var relativePathEndStr = hasMatch ? relativePathStr.replace( /\.\.\//g, "") : relativePathStr;

    var targetFolder = scriptFolder;

    for(var i = 0; i < matchesDotDotSlash.length; i++)
    {
        targetFolder = targetFolder.parent;
    }

    // will support both "../image.png" and "/../image.png"
    var file = new File(targetFolder + (relativePathEndStr.toString()[0] == "/" ? "" : "/") + relativePathEndStr);

    return file;
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
					obj.imageFile = {};
					obj.imgFile.exists = false;
				}
			}
			else
			{
				// placeholder object property
				obj.imageFile = {};
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
				$.writeln( (obj.imgFile.exists ? "Found: " : "*** NOT FOUND: ") + obj.imgFile.name);
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

 
/* supercharge object type to store interface element functions (hi X! )	*/
Object.prototype.Components = new Array(); 

// generic close button
Object.prototype.addCloseButton = function( labelStr )
{
	var labelStr = labelStr != undefined ? labelStr : "";
	var closeButton = this.addButton( { label: labelStr ? labelStr : "Close", name: "ok", width: 150, height: 44, alignment: "center" });
	return closeButton;
};

/* Graphics treatment for CS6 (Dialog Window)*/
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

/* Graphics treatment for CS6 */
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

/* group component	*/
Object.prototype.addGroup = function(obj)
{
	/* if no object available, fallback to simple group	*/
	if(!obj) return this.add('group');
	
	/*	 has label?	*/
	if(obj.label)	
	{
		this.add('statictext', undefined, obj.label);
	}

	var c = this.add('group');
	c.orientation = obj.orientation ? obj.orientation : 'row'; /* column, row, stack	*/
	c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left'; /*  left, right, fill	*/
	
	c.spacing = obj.spacing ? obj.spacing : JSUI.SPACING;

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;

	if(obj.alignment) c.alignment = obj.alignment; /* left, center, right	*/
	if(obj.margins) c.margins = obj.margins;
	
	this.Components[obj.name] = c; 

	return c;
};

/* add row	*/
Object.prototype.addRow = function(obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addGroup({orientation: 'row'});

	c.alignChildren = obj.alignChildren != undefined ? obj.alignChildren : 'fill';
	c.alignment = obj.alignment != undefined ? obj.alignment : 'top'; /* bottom  center  fill */

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;

	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.margins) c.margins = obj.margins;

	if(obj.helpTip) c.helpTip = obj.helpTip;

	//, alignChildren: obj.alignChildren != undefined ? obj.alignChildren : 'fill', spacing:10});

	return c;
};

/* add column	*/
Object.prototype.addColumn = function(obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addGroup({orientation: 'column'});

	c.alignChildren = obj.alignChildren != undefined ? obj.alignChildren : 'fill';
	c.alignment = obj.alignment != undefined ? obj.alignment : 'top'; /* bottom  center  fill */
	
	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.margins) c.margins = obj.margins;

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;

	if(obj.helpTip) c.helpTip = obj.helpTip;

	return c;
};

/* add panel 	*/
Object.prototype.addPanel = function(obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.add('panel', undefined, obj.label ? obj.label : 'Default Panel Name');

	c.orientation = obj.orientation ? obj.orientation : 'column'; /* row, stack	*/
	c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left'; /*  right, fill	*/
	c.alignment = obj.alignment != undefined ? obj.alignment : 'top'; /*  */
	
	if(obj.margins) c.margins = obj.margins;
	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.alignment) c.alignment = obj.alignment;

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	
	this.Components[obj.name] = c; 

	return c;
};

/* tabbedpanel component */
Object.prototype.addTabbedPanel = function(obj)
{
	if(!obj) var obj = {};

	var c = this.add('tabbedpanel');

	if(obj.alignChildren) c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left'; /*  right, fill	*/

	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.margins) c.margins = obj.margins;
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	return c;
};

/* tab component	*/
Object.prototype.addTab = function(obj)
{
	if(!obj) return;
	var c = this.add("tab");
	c.text = obj.label != undefined ? obj.label : "Default Tab Name";
	c.orientation = obj.orientation ? obj.orientation : 'column';
	if(obj.alignChildren) c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left'; /*  right, fill	*/

	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.margins) c.margins = obj.margins;

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	return c;
};

/* divider component	*/
Object.prototype.addDivider = function(obj)
{
	if(!obj) var obj = {};
	var c = this.add("panel");
	c.alignChildren = 'fill';
	c.orientation = obj.orientation ? obj.orientation : 'row';

	if(JSUI.isCS6 && JSUI.CS6styling) c.darkMode();

	return c;
};

/* checkbox image component	*/
Object.prototype.addCheckBox = function(propName, obj)
{
	//if(!obj) return;
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
		//JSUI.PREFS[propName] = c.value;
		c.value = JSUI.PREFS[propName];
	};

	return c;
};

/* 
	addToggleIconButton

	usage:
	- the first parameter must be a string that matches the name of the variable
	- if that name matches a property which belongs to the JSUI.PREFS object, this property will be bound to the value of the checkbox/radiobutton
	- important: binding will not happen if the variable name does not match the string variable (first param)
	- the preset value can otherwise be passed as part of the obj parameter { value: true/false }
	- if an array of variable names (strings) is provided, the radiobutton logic will be applied automatically
	- images are required (minimum of one per component, full support requires six per component)
	- component can be forced to ignore/bypass its own prefs (as in the case of addImageGrid) with obj.createProperty = false
	- a local function can be passed 

	//
	var checkboxImage = container.addToggleIconButton('checkboxImage', { label: "Fallback text (shown if image is not found)", imgFile: "/img/image.png", helpTip: "Checkbox image helptip" });

	//
	var regularCheckbox = container.addToggleIconButton('regularCheckbox', { label: "Text", helpTip: "Regular checkbox helptip" });
	
	//
	var radioButtonsArr = ['one', 'two', 'three'];

	var one = container.addToggleIconButton('one', { label: "First RadioButton", array: radioButtonsArr, helpTip: "First RadioButton helptip" });
	var two = container.addToggleIconButton('two', { label: "Second RadioButton", array: radioButtonsArr, helpTip: "Second RadioButton helptip" });
	var three = container.addToggleIconButton('three', { label: "Third RadioButton", array: radioButtonsArr, helpTip: "Third RadioButton helptip" });

	//
	var radioButtonsArr = ['one', 'two', 'three'];

	var one = container.addToggleIconButton('one', { label: "First RadioButton", array: radioButtonsArr, imgFile: "/img/image1.png", helpTip: "First RadioButton helptip" });
	var two = container.addToggleIconButton('two', { label: "Second RadioButton", array: radioButtonsArr, imgFile: "/img/image2.png", helpTip: "Second RadioButton helptip" });
	var three = container.addToggleIconButton('three', { label: "First RadioButton", array: radioButtonsArr, imgFile: "/img/image3.png", helpTip: "Third RadioButton helptip" });
*/
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
/*

var obj = {   propertyNames: ['one', 'two', 'three'], 										// individual property names
                        labels: ['One.', 'Two...', 'Three!'],
                        helpTips: ['(Number one)', '(Number two)', '(Number three)'],
						createProperties: false, 											// default is true: false will still use values from INI if present
																							// typically used to keep toggleIconButton values out of the INI file because they are used as part of a complex widget (such as addImageGrid)
                        images: ["img/one.png", "img/two.png","img/three.png"],
                        selection: 0, 														// optional: make sure this does not conflict with JSUI.PREFS object properties 
                        onClickFunction: function(){ if($.level) $.writeln("Oh HAI! Iz clicked."); }
					};
container.addToggleIconGroup( obj );

*/
Object.prototype.addToggleIconGroup = function( obj )
{
    // abort if no object provided
    if(obj == undefined) return;

    if(obj.propertyNames == undefined) return;

    var componentsArray = [];
    var iniPropertiesPresent = false;
    var selectionPresent = false;

    // look for existing properties in INI file
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
        iconObj.imgFile = obj.images[i];
        iconObj.selection = arraySelectionIndex != 0 ? arraySelectionIndex : obj.selection;  // iniPropertiesPresent ?
        iconObj.onClickFunction = obj.onClickFunction;

        var c = this.addToggleIconButton( obj.propertyNames[i], iconObj );

        // determine which component will be active by default
        if(iconObj.selection != undefined)
        {
            if(iconObj.selection == i)
            {
                // if using toggleiconbutton (images) c.value is either 0 or 1
                if(iconObj.imgFile != undefined) c.value = 1;
                else c.value = true;

                selectionPresent = true;
            }
        }
        c.update();
        componentsArray.push(c);
        this.Components[obj.propertyNames[i]] = c;
    }

    // if using radiobuttons and no selection was specified in the process, turn on first object in the list
    if(obj.array && !selectionPresent)
    {
        if(iconObj.imgFile != undefined) componentsArray[0].value = 1;
        else componentsArray[0].value = true;
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
// var propertyName = container.addImageGrid( "propertyName", { strArray: [ "0", "1", "2", "3", "4", "5", "6", "7", "8" ]], imgFile: "image.png", rows: 3, columns: 3 } );
Object.prototype.addImageGrid = function(propName, obj)
{
	/*
		expected properties
		
		// array of strings for storing as selection
		obj.strArray = [ anchorPosition.TOPLEFT,  anchorPosition.TOPLCENTER, anchorPosition.TOPRIGHT ];
		
		// object with active+inactive ScriptUI images)
		obj.states = JSUI.getScriptUIStates() 
		// if obj.states.length == strArray.length, assume a grid which uses a different set of ScriptUI images for each component
		
	*/
	obj.rows = parseInt(obj.rows);
	obj.columns = parseInt(obj.columns);

	// if no array is provided, create one to work with
	if(obj.strArray == undefined)
	{
		obj.strArray = [];
		for(var i = 0; i < ( JSUI.PREFS.imageGridColumns * JSUI.PREFS.imageGridRows); i++ )
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
	var grid = this.addColumn();

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
		var r = grid.addRow();

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

/* radiobutton component	*/
/* 
	var radiobuttons = win.add('group');	
	var array = ['rb1', 'rb2', 'rb3'];

	var rb1 = radiobuttons.addRadioButton ( 'rb1', { label:'Radiobutton 1', value:prefs.rb1, prefs:prefs, array:['rb1', 'rb2', 'rb3'] } );
	var rb2 = radiobuttons.addRadioButton ( 'rb2', { label:'Radiobutton 2', value:prefs.rb2, prefs:prefs, array:['rb1', 'rb2', 'rb3'] } );
	var rb3 = radiobuttons.addRadioButton ( 'rb3', { label:'Radiobutton 3', value:prefs.rb3, prefs:prefs, array:['rb1', 'rb2', 'rb3'] } );
*/
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

		/* if array of radiobutton variables provided, loop through corresponding preferences in object and update accordingly	*/
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
	};
	
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
//	var edittext = container.addEditText( "edittext", { text:new Folder(prefs.sourcePath).fsName, specs:{browseFile:true/*, browseFolder:true*/}, width:600, label:"Folder:"} );
// (note: if prefsObj has corresponding property, it is updated on the fly by OnChange event)
// 	
Object.prototype.addEditText = function(propName, obj)
{	
	/*
		** bug with file/folder if "~/" ?
		auto-characters: value.toString().length
		if useGroup, option to insert in existing container? (window/panel/group?)
		if label, auto-use group?
	

Note: To make active work in CC you have to set it in a so-called callback:

var myText = myWindow.add ("edittext", undefined, "John");
myText.characters = 30; 

myWindow.onShow = function ()
{
	myText.active = true; 
}
		*/
	
//	var obj = obj != undefined ? obj : {};
	obj.text = obj.text != undefined ? obj.text : (JSUI.PREFS[propName] != undefined ? JSUI.PREFS[propName] : "");
	var readonly = obj.readonly != undefined ? obj.readonly : false;
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
		var c = g.add('edittext', undefined, obj.text != undefined ? decodeURI (obj.text) : propName, {multiline:obj.multiline, readonly: readonly});
	}
	else 
	{
		var c = this.add('edittext', undefined, obj.text != undefined ? decodeURI (obj.text) : propName, {multiline:obj.multiline, readonly: readonly});
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
					if($.level) $.writeln("Browsing for directory. Default path: " + testFolder.fsName);
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
					if($.level) $.writeln("Browsing for file to " + (openFile ? "open" : "save over") + ". Default path: " + testFile.parent.fsName);
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
	if(obj.disabled) c.enabled = !obj.disabled;

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

/* add browse for folder edittext+browsebutton combo
	var browseFolder = win.addBrowseForFolder( "browseFolder", { characters: 30} );
*/
Object.prototype.addBrowseForFolder = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	// var c = this.addEditText(propName, { text: obj.text != undefined ? obj.text : new Folder(JSUI.PREFS[propName]).fsName, label:obj.label, characters: obj.characters ? obj.characters : 45, specs:{ browseFolder:true, addIndicator:true, addBrowseButton:true, useGroup:true, groupSpecs:{ alignment: obj.alignment != undefined ? obj.alignment : 'right'}} } );
	var c = this.addEditText(propName, { text: obj.text != undefined ? obj.text : new Folder(JSUI.PREFS[propName]).fsName, label:obj.label, characters: obj.characters ? obj.characters : 4, width: obj.width ? obj.width : 300, onChangingFunction: obj.onChangingFunction ? obj.onChangingFunction : undefined, specs:{ browseFolder:true, addIndicator:true, addBrowseButton:true, useGroup:true, groupSpecs:{ alignment: obj.alignment != undefined ? obj.alignment : 'right'}} } );

	return c;
};

/* add browse for folder edittext+browsebutton combo
	var browseFile = win.addBrowseForFile("browseFile", { characters: 40, filter: "png", open: true} ); // open: false for saveDlg
*/
Object.prototype.addBrowseForFile = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addEditText(propName, { label:obj.label, /*text: obj.text != undefined ? obj.text : new File(JSUI.PREFS[propName]).fsName,*/ characters: obj.characters ? obj.characters : 45, width: obj.width ? obj.width : 300, onChangingFunction: obj.onChangingFunction ? obj.onChangingFunction : undefined, specs:{ browseFile:true, openFile: obj.openFile != undefined ? obj.openFile : true, filter:obj.filter, addIndicator:true, addBrowseButton:true, useGroup:true, groupSpecs:{ alignment: obj.alignment != undefined ? obj.alignment : 'right', spacing: obj.spacing}, hasImage:false/*, imgFile: (JSUI.URI + "/img/BrowseForFile.png") */}, } );

	/*
			// example: get file types from array
			var imgTypes = [];
			var imgTypesStr = null;
			
			imgTypes.push("psd");
			imgTypes.push("png");
			imgTypes.push("tga");
			imgTypes.push("jpg");
			imgTypes.push("bmp");
			imgTypes.push("gif");

			// 
			if(imgTypes.length)
			{
				imgTypesStr = "/\\.(";
				
				for(var i = 0; i < imgTypes.length; i++)
				{
					imgTypesStr += imgTypes[i] + (i < imgTypes.length-1 ? "|" : "");
				}
				imgTypesStr += ")$/i";
			}
			
			if(imgTypes.length)
			{
				eval("images = imgFolder.getFiles(" + imgTypesStr + ");");
			}
			// fallback to all types with eval()
			else
			{
				images = imgFolder.getFiles(/\.(jpg|psd|png|tga|bmp|gif)$/i);
			}
	*/

	return c;
};

Object.prototype.addBrowseForFileReplace = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	
	// var c = this.addEditText(propName, { text: obj.text != undefined ? obj.text : new File(JSUI.PREFS[propName]).fsName, label:obj.label, characters: obj.characters ? obj.characters : 45, specs:{ browseFile:true, openFile: false, filter:obj.filter, addIndicator:true, addBrowseButton:true, useGroup:true, groupSpecs:{ alignment: obj.alignment != undefined ? obj.alignment : 'right', spacing: obj.spacing}, hasImage:false/*, imgFile: (JSUI.URI + "/img/BrowseForFile.png") */}, } );
	var c = this.addBrowseForFile(propName, { label:obj.label, characters: obj.characters != undefined ? obj.characters : 40, filter: obj.filter, open: false} );
	
	return c;
};

/*
	Add Browse for Folder Widget
	- manages toggling between fixed folder vs dynamic folder locations
	- includes support for optional independant onChanging and onToggle functions

var browseWidget = container.addBrowseForFolderWidget( "browseWidget", { characters: 50, useFixedOption: true, imgFiles: ["img/createLocation.png", "img/openLocation.png", "img/browseWidgetUseFixed.png" ],  showFixedToggle: true, showUnsavedFileWarning: true, onChangingFunction: browseWidgetChangingFn, onToggleFixedFunction: toggleFixedExportPathFn } );

*/
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
		// var testPath = new Folder( JSUI.fsname2uri( encodeURI( c.text.trim() ) ) );
		var testPath = new Folder( c.text.trim() );
		var pathMatchesSystem = testPath.toString().match( app.path ) != null;

//		alert( testPath.fsName + "\n\npathMatchesSystem: " + pathMatchesSystem);

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
            
            // if($.level) JSUI.debug("\n" + propName+'UseFixed' + ": " + JSUI.PREFS[propName+'UseFixed'] + "\n"+propName+'UseFixed'+".image: " + this.image); 
            
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

            // if($.level) $.writeln(propName+'UseFixed' + ": Using " + scriptUIStatesObj.active);

            if(JSUI.isPhotoshop && JSUI.isCS6)
            {
                // update ScriptUI images used by mouseevents
                this.states.normalState = this.value ? scriptUIStatesObj.normalState : scriptUIStatesObj.normalStateInactive;
                this.states.overState = this.value ? scriptUIStatesObj.overState : scriptUIStatesObj.overStateInactive;
                this.states.downState = scriptUIStatesObj.downState;

				if(this.image != this.states.normalState) this.image = this.states.normalState;
				
				// if( this.value )
				// {
				// 	c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.dark, 1);
				// 	c.graphics.backgroundColor = c.graphics.newBrush (c.graphics.PenType.SOLID_COLOR, JSUI.yellow, 1);
				// }
				// else
				// {
				// 	c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
				// 	c.graphics.backgroundColor = c.graphics.newBrush (c.graphics.PenType.SOLID_COLOR, JSUI.dark, 1);
				// }

				c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, (this.value ? JSUI.dark : JSUI.light), 1);
				c.graphics.backgroundColor = c.graphics.newBrush (c.graphics.PenType.SOLID_COLOR, (this.value ? JSUI.yellow : JSUI.foregroundDark), 1);
            }
            else
            {
                this.image = this.value ? scriptUIStatesObj.active : scriptUIStatesObj.inactive;
                // JSUI.debug("\n\t" + propName+'UseFixed' + ".update() " + JSUI.PREFS[propName+'UseFixed'] + "\n\timage:\t" + this.image + "\n\t\tactive:\t" + scriptUIStatesObj.active + "\n\t\tinactive:\t" + scriptUIStatesObj.inactive);
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
Object.prototype.addNumberInt = function(propName, obj)
{
    // to do: force negative or positive?
	obj.text = obj.text != undefined ? obj.text : (JSUI.PREFS[propName] != undefined ? JSUI.PREFS[propName] : "");
	var readonly = obj.readonly != undefined ? obj.readonly : false;

    var g = this.add('group');
    g.orientation = "row";

    var label = obj.label != undefined ? obj.label : propName;
    var l = g.add('statictext', undefined, label);

    var c = g.add('edittext', undefined, obj.text, { readonly: readonly });

    if(obj.characters)// && (JSUI.isPhotoshop && !JSUI.isCS6)) 
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

    c.onChange = function()
    {
        var str = c.text.trim();
        var num = Number(str);
        var round = Math.round(num);

        if(!isNaN(round))
        {
            c.text = round;
            JSUI.PREFS[propName] = round;
            JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
    
          //  c.onChanging();
            if(JSUI.autoSave) JSUI.saveIniFile();
            if(obj.onChangingFunction) obj.onChangingFunction();
        }
    };

    c.onChanging = function()
   {
       var str = c.text.trim();

        // if(str.match(/0x/i) != null)
        // {
            //JSUI.PREFS[propName] = encodeURI (c.text.trim());
            //JSUI.PREFS[propName] = Number(str);
            JSUI.PREFS[propName] = parseInt(str);
            JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
        //}
        if(obj.onChangingFunction) obj.onChangingFunction();
   }; 

   this.Components[propName] = c;

    return c;
};

// force float edittext with fixed decimals (default is 1, 128 changes into 128.0)
// var floatNum = container.addNumberFloat("floatNum", { label: "float", decimals: 4 });
Object.prototype.addNumberFloat = function(propName, obj)
{
    // inherit logic from int edittext component
    var c = this.addNumberInt(propName, obj);
    
    // override callbacks
    c.onChange = function()
    {
        var str = c.text.trim();
        var num = Number(str);
        var numFloat = num.toFixed( !isNaN(obj.decimals) ? obj.decimals : 1 );

        if(!isNaN(num))
        {
            c.text = numFloat;
            JSUI.PREFS[propName] = c.text; // numFloat
            JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 

            if(JSUI.autoSave) JSUI.saveIniFile();
            if(obj.onChangingFunction) obj.onChangingFunction();
        }
    };

    c.onChanging = function()
   {
        var str = c.text.trim();

        var num = Number(str);
        var numFloat = num.toFixed( !isNaN(obj.decimals) ? obj.decimals : 1 );

        if(!isNaN(num))
        {
            JSUI.PREFS[propName] = numFloat;
            JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 

            if(obj.onChangingFunction) obj.onChangingFunction();
        }
   }; 

    if(!isNaN(obj.decimals))
    {
        c.text = Number(c.text).toFixed( obj.decimals);
    }
    return c;
};

// swatch thingie
Object.prototype.addRectangle = function(propName, obj)
{	
    var obj = obj != undefined ? obj : {};
    obj.hexValue = obj.hexValue != undefined ? obj.hexValue : "FFFFFF";
    obj.textHexValue = obj.textHexValue != undefined ? obj.textHexValue : "000000";

	var c = this.add('iconbutton', undefined, undefined, {name: propName.toLowerCase(), style: 'toolbutton'});
	this.Components[propName] = c;
	c.size = [ obj.width != undefined ? obj.width : 50, (obj.height != undefined ? obj.height : 50) ];

    if(JSUI.isPhotoshop)
    {
        var rectCol = new SolidColor();
        rectCol.rgb.hexValue = obj.hexValue;
    
        var textCol = new SolidColor();
        textCol.rgb.hexValue = obj.textHexValue;

        var rectRed = rectCol.rgb.red/255;
        var rectGreen = rectCol.rgb.green/255; 
        var rectBlue = rectCol.rgb.blue/255; 

        var textRed = textCol.rgb.red/255;
        var textGreen = textCol.rgb.green/255; 
        var textBlue = textCol.rgb.blue/255; 
    }
    else if(JSUI.isIllustrator)
    {
        var rectRed = JSUI.HexToR(obj.hexValue)/255;
        var rectGreen = JSUI.HexToG(obj.hexValue)/255;
        var rectBlue = JSUI.HexToB(obj.hexValue)/255;

        var textRed = JSUI.HexToR(obj.textHexValue)/255;
        var textGreen = JSUI.HexToG(obj.textHexValue)/255;
        var textBlue = JSUI.HexToB(obj.textHexValue)/255;
    }

	c.fillBrush = c.graphics.newBrush( c.graphics.BrushType.SOLID_COLOR, [ rectRed, rectGreen, rectBlue, 1] );
	c.text = obj.text != undefined ? obj.text : "";
	if(c.text) c.textPen = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR,[ textRed, textGreen, textBlue ], 1);
	c.onDraw = customDraw;

	function customDraw()
	{ 
		with( this )
		{
			graphics.drawOSControl();
			graphics.rectPath( 0, 0, size[0], size[1]);
			graphics.fillPath( fillBrush );
		}
	}

	return c;
};

// dropdownlist component
// 	var ddlist = container.addDropDownList( { prefs:prefsObj, name:"ddlist", list:["Zero", "One", "Two"] , label:"Choose a number:"} );
// (note: if prefsObj has corresponding property, it is updated on the fly by OnChange event)
Object.prototype.addDropDownList = function(propName, obj)
{	
	var obj = obj != undefined ? obj : {};
	
	var useGroup = false;
	
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
	
	
	if(obj.list)
	{ 
		for(var i = 0; i < obj.list.length; i++)
		{
			c.add("item", obj.list[i]);
		}
		
		c.selection = obj.selection != undefined ? obj.selection : JSUI.PREFS[propName];
	}
	
	if(obj.label2)	
	{
		this.add('statictext', undefined, obj.label2);
	}
		
	this.Components[propName] = c;

	// callbacks
	c.onChange = function()
	{
		var currentValue = JSUI.PREFS[propName];
		var changed = false;
		for(var i = 0; i < obj.list.length; i++)
		{
			if(i == parseInt(c.selection))
			{ 
				JSUI.PREFS[propName] = i;

				changed = (currentValue != JSUI.PREFS[propName])

				JSUI.debug(propName + ": [" + c.selection + "]  " + obj.list[i]); 
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
		c.selection = JSUI.PREFS[propName];
		//c.onChange();
	}

	

	return c;
};

// button component
/*
	EXAMPLES

	var button = container.addButton( {label:"Filter Folder Content"} );
	var iconbutton = container.addButton( { imgFile:new File("/path/to/file.png") } ); // { imgFile: "file.png" } should also work
	var iconbuttonAlso = container.addButton( "iconbuttonAlso", { } ); // tells JSUI.getScriptUIStates() to look for "iconbuttonAlso.png"
	
	// couple in context with an edittext component in order to automate file/folder location functions
	// prefsObj needs a "specs" property (Object), with a direct reference to an existing edittext var name (textfield:varname), 
	// as well as a String that points to the prefsObj property name (prop:"propertyname")
	// onClick and onChanging callback functions are automatically assigned, and they take care of updating the prefsObj properties.
	
	var sourcepath = container.addEditText( { name:"sourcepath", text:new Folder(prefsObj.sourcepath).fsName, prefs:prefsObj } );		
	var browsebtn = container.addButton( {label:"Browse...", prefs:prefsObj, specs:{ prefs:prefsObj, browseFolder:true, textfield:sourcepath, prop:"sourcepath"} } );
*/
//Object.prototype.addButton = function(obj)
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
	else if( typeof imgNameStr == "string" &&  typeof obj == "object")
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
		scriptUIstates = JSUI.getScriptUIStates( obj );
	}
	
	if(obj.imgFile != undefined && scriptUIstates.active != undefined)
	{
		if($.level) $.writeln("Adding iconbutton" + "\n");
		// var c = this.add('iconbutton', undefined, ScriptUI.newImage(obj.imgFile, imgFileUp.exists ? imgFileUp : obj.imgFile, imgFileDown.exists ? imgFileDown : obj.imgFile, imgFileOver.exists ? imgFileOver : obj.imgFile));
		var c = this.add('iconbutton', undefined, scriptUIstates.active, { style: "toolbutton" });
	}
	else
	{
		if($.level) $.writeln("Adding standard text button.");
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

			if($.level) $.writeln("Updating jsui button: " + scriptUIStatesObj.active);

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
				if($.level) $.writeln("Browsing for output directory. Default path: " + testFolder.fsName);
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
				if($.level) $.writeln("Browsing for file. Default path: " + testFile.parent.fsName);
				if(!testFile.exists) defaultFile = "~";
				
		/*		// from http://www.ps-scripts.com/bb/search.php?sid=8d2ede8c78539ff6b59f4146a6cd1ccf
				if(File.myDefaultSave)
				{
				   Folder.current = File.myDefaultSave;
				}

				var saveFile = File.saveDialog("Prompt", "selection"); 
				if(saveFile)
				{
				   File.myDefaultSave = saveFile.parent;
				}
		*/	
		//		var chosenFile = File.saveDialog(obj.specs.textfield.text, "TEXT:*.txt");
		
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

Object.prototype.addImage = function(obj)
{
	// if no object is passed, return as simple image placeholder
	if(obj == undefined)
	{
		var c = this.add('image', undefined, undefined);
		c.preferredSize.width = 100;
		c.preferredSize.height = 100;
		return c;
	}

	// var scriptUIstates = JSUI.getScriptUIStates( obj );
		// component constructor should support valid scriptUIStates
		var scriptUIstates;
		// c.scriptUIstates = scriptUIstates; 

		if(obj.imgFile != undefined && obj.imgFile != null)
		{
			scriptUIstates = obj.imgFile.active != undefined ? obj.imgFile : JSUI.getScriptUIStates( obj );
		}
		else
		{
			scriptUIstates = JSUI.getScriptUIStates( obj );
		}

	// if(scriptUIstates.active != undefined)
	if(scriptUIstates != undefined)
	// if(scriptUIstates != null)
	{
		var c = this.add('image', undefined, scriptUIstates.active);
		// c.scriptUIstates = scriptUIstates; 
	}
	else
	{		
		// fallback in case image does not exist
		var c = this.add('statictext', undefined, "[Invalid URI: " + obj.imgFile + "]");
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

		if($.level) $.writeln(propName + ": Using " + scriptUIStatesObj.active);

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
// var picker =  container.addColorPicker("picker", { label: "Color", value: "FF00dd", width: 64, height: 64, helpTip: "Choose color using system color picker"});
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
				g = this.addColumn( { alignChildren: "left" } );
			}
			else
			{
				g = this.addRow( { alignChildren: "left" } );
			}
		}
		else
		{
			g = this.addRow( { alignChildren: "left" } );
		}
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
	
		// if(JSUI.STYLE) l.graphics.font = JSUI.STYLE;
		groupObjectsArray.push( [l, propName+'Label'] );
	}

	var c = useGroup ? g.add('iconbutton', undefined, undefined, {name:propName, style: 'toolbutton'}) : this.add('iconbutton', undefined, undefined, {name:propName, style: 'toolbutton'});
	c.size = [ obj.width != undefined ? obj.width : 48, obj.height != undefined ? obj.height : 48];
	c.helpTip = obj.helpTip != undefined ? obj.helpTip : "Choose color using system color picker";

	// Photoshop CS6 requires a width, apparently?
	var editTextObj = { characters: 6, width: 50, text: defaultValue, onChangingFunction: updatePicker, helpTip: "Enter hexadecimal RGB value\n(i.e: FFFFFF)", specs:{ prefsBypass: true } };

	var hexEdittext = useGroup ? g.addEditText(propName+"Text", editTextObj ) : this.addEditText( propName+"Text", editTextObj );
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
		hexEdittext.onChange();
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
//~ 	if(!obj.width && obj.maxvalue < 1000) c.preferredSize.width = obj.maxvalue - obj.minvalue; // use max value if width is not available
	c.value = obj.value != undefined ? JSUI.clampValue(obj.value, obj.minvalue, obj.maxvalue) : JSUI.clampValue(JSUI.PREFS[propName], obj.minvalue, obj.maxvalue);
	
	this.Components[propName] = c;
	
	var round = false;

	if(obj.round != undefined)
	{
//~ 		round = obj.round;
		
		/* infer */
//~ 			
//~ 			switch(round)
//~ 			{

//~ 				default "int" :
//~ 				{
//~ 					
//~ 					
//~ 				}
//~ 				
//~ 				// default covers for true/false, int, etc
//~ 				case default :
//~ 				{
//~ 					
//~ 				}
//~ 			}
//~ 			
	}
	
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
			//	sliderValue = sliderValue < obj.minvalue && !(sliderValue > obj.maxvalue) ? obj.minvalue : obj.maxvalue;
				if(!isNaN(sliderValue))
				{
					c.value = sliderValue;
					text.text = sliderValue;
				}
			}
		}
//~ 	}

	c.update = function()
	{
//~ 		JSUI.PREFS[propName] = Math.round(c.value); 
		
		if(obj.specs)
		{
			// update textfield
			text.text = !isNaN(JSUI.PREFS[propName]) ? JSUI.PREFS[propName] : text.text;
			
			// also update slider
//~ 			var num = Math.round( Number(this.Components[propName].text) );
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

// listbox component
/* EXAMPLE
	var listbox = container.addListBox( { name:"listbox", label:"Listbox Component:", prefs:prefsObj, list:["Zero", "One", "Two", "Three"], multiselect:true, width:300, height:100 } );	
*/
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
//	if(obj.enabled) c.enabled = obj.enabled;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	//, otherwise use as is (assume an array-type object)
	
	var selection = null;
//~ 	if($.level) $.writeln("obj.selection: " + obj.selection + "  typeof " + typeof obj.selection);
	
	switch(typeof obj.selection)
	{
			case undefined :
			{
//~ 				alert("obj.selection is undefined!")
					// leave as null
			}
			
			// if obj.selection is a number, feed it as a single index array
			case "number" :
			{
//~ 				if($.level) $.writeln("obj.selection is a number: " + obj.selection);
				selection = [obj.selection];
			}
			
			// if obj.selection is an object, we're most likely working with an array 
			case "object" :
			{
				// mmmh this is wrong, stored value might be intentionally null
				if(obj.selection != null)
				{
					if(obj.selection.length != undefined)
					{
//~ 						alert("obj.selection has length! " + obj.selection);
						selection = obj.selection;
					}
					else
					{
						// ?
						selection = null;
					}
				}
				else
				{
					// object is null
					selection = null;
				}
				
			}
			case "string" :
			{
//~ 				var strToNum = Number(obj.selection);
				//selection = [parseInt (obj.selection)];
//~ 				alert(obj.selection + "  " + typeof obj.selection)

			}
			default :
			{
				// value remains null
//~ 				selection = null;
			}
	
	}

	// if selection is null

//~ 	alert("obj.selection: " + obj.selection + "   " + typeof obj.selection + "  length: " + (obj.selection.length != undefined ? obj.selection.length : null) + "\n\n" + "JSUI.PREFS["+propName+"]: " + JSUI.PREFS[propName] + "   " + typeof JSUI.PREFS[propName] + "  length: " + JSUI.PREFS[propName] );
	
		// if obj.selection is not undefined, check for either null, empty array or number
		
		
	
//~ 	c.selection = obj.selection != undefined ? (typeof obj.selection == "number" ? [obj.selection] : obj.selection) : JSUI.PREFS[propName];
//~ alert(selection + " " + typeof selection + "  typeof null: " + typeof null )
	c.selection = selection;
	c.doubleClicked = null;

	// update UI based on current JSUI.PREFS[propName] array
	c.update = function()
	{
			//if using update() when UI.PREFS.listbox does NOT exist, automatically selects the 0 index
//~ 			c.selection = JSUI.PREFS[propName] ;
//~ 			alert(JSUI.PREFS[propName] + "  " + JSUI.PREFS[propName] == undefined);

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
						//if($.level) 
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

		if(JSUI.autoSave) JSUI.saveIniFile();
	};

	// in case of doubleclick
	c.onDoubleClick = function()
	{
		var selectionArr = c._buildArray();
		JSUI.PREFS[propName] = selectionArr[0];

		JSUI.debug("Doubleclicked item: " + selectionArr[1]); //($.level ? selectionArr[1] : [])); 

		c.doubleClicked = selectionArr[1];

		if(obj.onClickFunction)
		{
		//	alert(selectionArr[0] + "\n" + selectionArr[1]);
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
		//c.msg.enabled = false;
		c.msg.graphics.font = ScriptUI.newFont(JSUI.isWindows ? "Tahoma" : "Arial", "REGULAR", 10);
	}
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
//	if(obj.enabled) c.enabled = obj.enabled;	
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

//	if(progressBar.isDone) { break;}

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
		if(debug /*&& $.level*/ ) JSUI.debug( "" );

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
	var c = this.addButton( { name:"deleteinifile", label: obj.label != undefined ? obj.label : "[DEL]", helpTip: "Remove current settings file from system"} );
			
	c.onClick = function()
	{
		JSUI.deleteIniFile();
	};

	return c;
};

Object.prototype.addOpenINILocationButton = function( obj )
{
	var obj = obj != undefined ? obj : {};
	var c = this.addButton( { name:"openinifilelocation", label: obj.label != undefined ? obj.label : "[OPEN]", helpTip: "Reveal settings file location in " + (JSUI.isWindows ? "Windows Explorer" : "Finder") + "\n" + JSUI.INIFILE.fsName } );
			
	c.onClick = function()
	{
		JSUI.openIniFileLocation();
	};
	
	return c;
};

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
				c = container.addEditText(property, {/*label:"Number:", */specs:{useGroup:true}});
				if(pushToArray) array.push(c);
				break;
			}
		
			case "string" :
			{
				if($.level) $.writeln("CREATING EDITTEXT: STRING");
				c = container.addEditText(property, {/*label:"String:", */specs:{useGroup:true}});
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
		//		if($.level) $.writeln("CREATING DROPDOWNLIST");
				
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
						//	JSUI.PREFS[cName] 
							
							c.value = JSUI.PREFS[cName] != undefined ? JSUI.PREFS[cName] : false;
							
							if(pushToArray) array.push(c);
						}
					}
					// otherwise create dropdownlist
					else
					{
						if($.level) $.writeln("CREATING DROPDOWNLIST");
						
						var cName = property; //+ "_ddl_selection";
						
						c.selection = JSUI.PREFS[cName];
					//	JSUI.PREFS[cName]
						
						c = container.addDropDownList(cName, {list:value}); // , selected: }
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

/*
	INI FILE MANAGEMENT
	functions adapted from Xbytor's Stdlib.js
*/

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
			// if(idx == "textureid") alert("empty: " + idx + ": " + val);
/*
			if( !isNaN(Number(val)) )
			{
				// Workaround for cases where "000000" which should remain as is
				
				// if string has more than one character, 
				// and if first character is a zero
				// and second character is not a dot (decimals etc)
				// then number or string was meant to keep its exact present form 
				
//				if(val.length > 1 && ( (val[0] == "0" || val[0] == ".") && (val[1] != "." || val[1].toLowerCase() == "x") ) ) 
				//obj[prop] = val;
				// else do force number
//				else 
				val = Number(val);
			}
			else
			{
				val = "";
			}
	*/	
//~ 			if(typeof val == "number")// && (val.toString(16)[0] == "0" && val.toString(16)[1].toLowerCase() == "x"))
//~ 			{
//~ 				$.writeln(val + "  " + val.toString(10) + "  " + val.toString(16));
//~ 				
//~ 			}
		
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
//~ 			var val = obj[idx];
//~ 			alert("Houla!\n\n" + idx+"\n\n" + val);
			
		}
	} 

	return str;
};

// fromIniString adjustments (type = true: attempts to infer type based on value)
JSUI.fromIniString=function(str,obj, type)
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
		{ //unless...

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
			// report!
		//	if($.level) $.writeln("obj." + prop + " = " + value + "\t [" + typeof obj[prop] + "]");
		}
		
	}
	if($.level && JSUI.PrintINIstringInfo) JSUI.reflectProperties(obj, "\n[READING FROM INI STRING:]");
	return obj;
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

JSUI.saveIniFile = function()
{
	JSUI.writeIniFile(JSUI.INIFILE, JSUI.PREFS, "# " + JSUI.TOOLNAME + " Settings [jsuiLib v" + JSUI.version + "]\n");
	if($.level) $.writeln("Settings stored successfully.");
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

	try
	{
		JSUI.INIFILE.parent.execute();	
	}
	catch(e)
	{
		alert("Error opening settings file:\n\n" + JSUI.INIFILE.paren.fsName + "\n\n" + e);
	}
};

// XBytor's string trim
String.prototype.trim = function()
{
	return this.replace(/^[\s]+|[\s]+$/g,'')
};

// power of 2 check
JSUI.isPower2 = function(n)
{
	// while(true)
	// {
	// 	var sr = Math.sqrt(n);
	// 	if(Math.floor(sr) != sr)
	// 	{	
	// 		return false;
	// 	}
	// 	else if(sr == 2)
	// 	{
	// 		return true;
	// 	}
	// 	else
	// 	{
	// 		n = sr;
	// 	}
	// }
	var n = n = Math.floor(n);
	if( n > 0 )
	{
		while( n % 2 == 0)
		{
			n /= 2;
		}
		if( n == 1 )
		{
			return true;
		}
		
		return false;
	}
	else
	{
		return null;
	}
};

// get next power of 2
JSUI.getNextPow2 = function(n)
{
	var p = 2;
	n = Math.floor(n);
	while(n > p)
	{
		p = p * 2;
	}
	
	return p;
};

// get previous power of 2
JSUI.getPreviousPow2 = function(n)
{
	var p = 2;
	var n = Math.floor(n);
	while(n >= p)
	{
		p = p * 2;
	}
	return p / 2;
};

// multiple of x check
JSUI.isMult = function(n, mult)
{
	return (Math.ceil(n/mult) * mult == n);
};

// get next multiple of x
JSUI.getNextMult = function(n, mult)
{
	return (n % mult == 0) ? n : ( n + (mult - (n % mult)) );
};

// get previous multiple of x
JSUI.getPreviousMult = function(n, mult)
{
	//  return (n % mult == 0) ? n : ((n < mult == 0) ? JSUI.getNextMult(n, mult) : n - (n % mult));

	if(n % mult == 0) return n;
	else if(n < mult) return JSUI.getNextMult(n, mult);
	else return n - (n % mult);
};

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
};

// required
if(JSUI.isPhotoshop)
{
	cTID = function(s){ if(JSUI.isPhotoshop) { return app.charIDToTypeID(s); } else { return;} };
	sTID = function(s){ if(JSUI.isPhotoshop) { return app.stringIDToTypeID(s); } else { return;} };
}

/* workaround for Photoshop CS5/CS6 UI palette/dialog being weird on Windows
	http://www.davidebarranca.com/2012/10/scriptui-window-in-photoshop-palette-vs-dialog/	*/
JSUI.waitForRedraw = function()
{
	if(JSUI.isPhotoshop)
	{
		//~ 		app.refresh();
		//~ 	// or:	

		  var d = new ActionDescriptor();
		  d.putEnumerated(sTID('state'), sTID('state'), sTID('redrawComplete'));
		  return executeAction(sTID('wait'), d, DialogModes.NO);
	}
	else
	{
		return;
	}
};

/* this returns full active document path without building a histogram + bypasses the 'document not yet saved' exception)*/
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
			var docFullPathURIMatchesSystem = docFullPath.toString().match( app.path) != null;

			return docFullPathURIMatchesSystem ? undefined : docFullPath;
		}
		else
		{
			return;
		}
	}
};

/* set layer palette's object color */
JSUI.setLayerObjectColor = function( color )
{
	if(JSUI.isPhotoshop)
	{		
		if(color == "red") color = "Rd  "; 
		if(color == "blue") color = "Bl  "; 
		if(color == "orange") color = "Orng"; 
		if(color == "yellow") color = "Ylw "; 
		if(color == "green") color = "Grn "; 
		if(color == "violet") color = "Vlt "; 
		if(color == "gray") color = "Gry "; 
		if(color == "none") color = "None";
	
		var desc27 = new ActionDescriptor();
		var ref3 = new ActionReference();
		ref3.putEnumerated( charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt') );
		desc27.putReference( charIDToTypeID('null'), ref3 );
		var desc28 = new ActionDescriptor();
		desc28.putEnumerated( charIDToTypeID('Clr '), charIDToTypeID('Clr '), charIDToTypeID(color) );
		desc27.putObject( charIDToTypeID('T   '), charIDToTypeID('Lyr '), desc28 );
		executeAction( charIDToTypeID('setd'), desc27, DialogModes.NO );

	}
	else
	{
		return;
	}
};

/* randomize solidcolor object */
JSUI.randomizeRGBColor = function( hexStr, rangeFloat )
{
	if(JSUI.isPhotoshop)
	{		
		var hexStr = hexStr == undefined ? "000000" : typeof hexStr == "object" ? hexStr.rgb.hexValue : hexStr;
		var rangeFloat = rangeFloat == undefined ? 0.0 : rangeFloat;
	
		var c = new SolidColor();
		c.rgb.hexValue = hexStr;
	
		function _randomize( num, max )
		{
			var random = Math.random();
			var flux = rangeFloat * ( num * random );
		
			flux = ( random < 0.5 ? (-flux) : flux);
			flux = parseInt( num + flux);
			return flux < 0 ? 0 : flux > max ? max : flux;
		}
	
		if(rangeFloat > 0)
		{
			c.rgb.red = _randomize(c.rgb.red, 255);
			c.rgb.green = _randomize(c.rgb.green, 255);		
			c.rgb.blue = _randomize(c.rgb.blue, 255);
	
			// c.hsb.hue = _randomize(colorObj.hsb.hue, 360);
			// c.hsb.saturation = _randomize(c.hsb.saturation, 100);
			// c.hsb.brightness = _randomize(c.hsb.brightness, 100);
		} 
		else
		{
			// fully random RGB
			c.rgb.red = Math.round(Math.random()*255);
			c.rgb.green = Math.round(Math.random()*255);
			c.rgb.blue = Math.round(Math.random()*255);
	
			// fully random HSB
			// c.hsb.hue = Math.round(Math.random()*360);
			// c.hsb.saturation = Math.round(Math.random()*100);
			// c.hsb.brightness = Math.round(Math.random()*100);
		}
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
JSUI.hexToRGB = function (hex)
{
	var color = hex.trim().replace('#', '');
	var r = parseInt(color.slice(0, 2), 16) / 255;
	var g = parseInt(color.slice(2, 4), 16) / 255;
	var b = parseInt(color.slice(4, 6), 16) / 255;
	return [r, g, b, 1];
};

// hex string to Photoshop/Illustrator color object
JSUI.hexToRGBobj = function ( hexStr )
{
    var hex = hexStr != undefined ? hexStr : "000000";

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

// RGBA values to hexadecimal string (255, 0, 128) becomes "FF0080"
JSUI.RGBtoHex = function(r, g, b, a)
{
	return JSUI.toHex(r) + JSUI.toHex(g) + JSUI.toHex(b) + (a != undefined ? JSUI.toHex(a) : "")
};

// Number to hex 128 becomes "80"
JSUI.toHex = function(n)
{
	if (n == null) return "00";
	n = parseInt(n); 
	if (n == 0 || isNaN(n)) return "00";
	n = Math.max(0, n); 
	n = Math.min(n, 255); 
	N = Math.round(n);
	return "0123456789ABCDEF".charAt((n-n%16)/16) + "0123456789ABCDEF".charAt(n%16);
};

JSUI.cutHex = function(h)
{
	if(h.charAt(0)=="#") h = h.substring(1,7); else if(h.charAt(0)=="0" && h.charAt(1)=="x") h = h.substring(2,8); return h;
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

// DEBUG AREA

if($.level)
{
	// let's confirm that the file was properly included
	$.writeln("\nJSUI.js v" + JSUI.version + " successfully loaded by " + app.name + " " + app.version);
}
//EOF
