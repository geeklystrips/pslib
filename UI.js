// UI Dialog Library for Photoshop

/*
	Uses functions adapted from Xbytor's Stdlib.js
	http://ps-scripts.sourceforge.net
	
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
UI = function(){};

// version
UI.version = "0.45";

// system properties
UI.isWindows = $.os.match(/windows/i) == "Windows";

UI.TOOLNAME = "DEFAULTNAME";	
//This kind of data is frequently stored in ~/Library/Application Support.
//User-specific settings are frequently stored in ~/Library/Preferences
// Folder.appData = global, system preferences on OSX. Depending on user rights, applications might have trouble writing to this location.
UI.USERPREFSFOLDER = (UI.isWindows ? Folder.appData : "~/Library/Application Support");
UI.TOOLSPREFSFOLDERNAME = "pslib";
UI.INIFILE = UI.USERPREFSFOLDER + "/" + UI.TOOLSPREFSFOLDERNAME + "/" + UI.TOOLNAME + ".ini";
//alert(UI.INIFILE)
UI.populateINI = function()
{
	UI.INIFILE = UI.USERPREFSFOLDER + "/" + UI.TOOLSPREFSFOLDERNAME + "/" + UI.TOOLNAME + ".ini";
}

// INI prefs framework
UI.PREFS = {};

UI.SPACING = (UI.isWindows ? 3 : 0);
UI.CHARLENGTH = 20;

// failsafe for cases where the UI framework is used without a debugTxt dialog component
// if this variable is not replaced, calls by regular functions to modify its state should not cause problems
var debugTxt = {};

// these functions return specs relative to UI.js (unless included files are flattened)
UI.getScriptFolder = function()
{
	return UI.getScriptFile().parent;
};

UI.getScriptFileName = function()
{
	var f = UI.getScriptFile();
	return (f ? f.absoluteURI : '');
};

UI.getScriptFile = function()
{
	var path = $.fileName;
	return new File(path);
};

// *****
// these should also use encodeURI/decodeURI
// *****
// convert URL to URI	"C:\\Program Files\\Adobe" becomes "file:///C|/Program%20Files/Adobe"
UI.url2uri = function(url) 
{
	var uri = url.toString().replace(":", "|");
	uri = uri.replace(/\\/g, "/");
	uri = uri.replace(/ /g, "%20");
	uri = "file:///" + uri;
	return uri;
};

// convert URI to URL	"file:///C:/Program%20Files/Adobe" becomes "C:\Program Files\Adobe"
UI.uri2url = function(uri) 
{
	var url = uri.toString().substring(8);
	url = url.replace(/\//g, "\\");
	url = url.replace("|", ":");
	url = url.replace(/%20/g, " ");
	return url;
};

// convert file system name to URI	"C:\Program Files\Adobe" becomes "c/Program Files/Adobe"
UI.fsname2uri = function(fsname) 
{
	var uri = fsname;
	if($.os.match(/windows/i) == "Windows")
	{
		uri = fsname.toString().replace(":", "");
		uri = uri.replace(/\\/g, "/");
		uri = "/" + uri;
	}
	return uri;
};

// convert URI name to file system name	"c/Program Files/Adobe" becomes "C:\Program Files\Adobe"
UI.uri2fsname = function(uri) 
{
	if(uri instanceof Folder) var fsname = new Folder(uri);
	else	var fsname = new File(uri);
	return fsname.fsName;
};

// print object properties to javascript console (with ExtendScript Toolkit only)
UI.reflectProperties = function(obj, msg)
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
	
//~ 		if(typeof obj[val] == "string")
//~ 		{
//~ 			quotes += "\"";
//~ 		}
	
		str += "\t" + val + ":\t\t" + obj[val] + "\t\t[" + typeof obj[val] + "]\n";
	//	if($.level) $.writeln(msg);
	//	str+=msg
	}
	if($.level) $.writeln(str);
	return str;
};

// UI debug function (with ExtendScript Toolkit only)
UI.debug = function(text, textfield)
{
	if($.level)
	{
		if(textfield != undefined) textfield.text = text;
		$.writeln(text);
	}
};

// glyph to unicode
UI.getUnicode = function(str)
{
	var c = null;
	if(str != "" && str != null)
	{
		c = str.charCodeAt(0); // "@" becomes 64 (number)
		c = c.toString(16).toUpperCase();  // 64 becomes "40" (number converted to string with base 16)
		c = UI.zeropad(c);
	}
	return c;
};

// unicode to glyph
UI.getChar = function(num)
{
	var str = null;
	if(!isNaN(num))
	{
		str = String.fromCharCode(num);
	}
	return str;
};

UI.zeropad = function(str)
{
	// padding string with zeroes
	return (str.length < 2 ? "000" + str :  (str.length < 3 ? "00" + str : (str.length < 4 ? "0" + str : (str) ) ) ); // 40 becomes "0040"
};

// supercharge object type to store interface element functions
Object.prototype.Components = new Array(); 

// group component
Object.prototype.addGroup = function(obj)
{
	// if no object available, fallback to simple group
	if(!obj) return this.add('group');
	
	// has label?
	if(obj.label)	
	{
		this.add('statictext', undefined, obj.label);
	}

	var c = this.add('group');
	c.orientation = obj.orientation ? obj.orientation : 'row'; // column, row, stack
	c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left'; //  left, right, fill
	
	c.spacing = obj.spacing ? obj.spacing : UI.SPACING;

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment; // left, center, right
	
	this.Components[obj.name] = c; 
	return c;
};

// add row
Object.prototype.addRow = function()
{
	return this.addGroup({orientation:"row", alignChildren:"fill", spacing:10});
};

// add row
Object.prototype.addColumn = function()
{
	return this.addGroup({orientation:"column", alignChildren:"fill", spacing:10});
};

// panel component
Object.prototype.addPanel = function(obj)
{
	var c = this.add('panel', undefined, obj.label ? obj.label : 'Default Panel Name');

	c.orientation = obj.orientation ? obj.orientation : 'column'; // row, stack
	c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left'; //  right, fill
	
	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	
	this.Components[obj.name] = c; 
	return c;
};

// tabbedpanel component
// NOT TESTED
// SHOULD NOT BE USED BY PHOTOSHOP CS3 OR LOWER
Object.prototype.addTabbedPanel = function(obj)
{
	var c = this.add('tabbedpanel', undefined, obj.label ? obj.label : 'Default Panel Name');
	
	for(var i = 0; i < obj.tabs.length; i++)
	{
		var t = c.add("tab", undefined, obj.tabs[i]);
		
		this.Components[obj.name+'Tab'+i] = t;
	}
//~ 	c.orientation = obj.orientation ? obj.orientation : 'column'; // row, stack
//~ 	c.alignChildren = obj.alignChildren ? obj.alignChildren : 'left'; //  right, fill
//~ 	
//~ 	if(obj.spacing) c.spacing = obj.spacing;
//~ 	if(obj.width) c.preferredSize.width = obj.width;
//~ 	if(obj.height) c.preferredSize.height = obj.height;
//~ 	if(obj.alignment) c.alignment = obj.alignment;

	this.Components[obj.name] = c; 
	return c;
};

// checkbox component
Object.prototype.addCheckBox = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	
	var c = this.add('checkbox', undefined, obj.label ? obj.label : propName);
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	// assign value
	c.value = obj.value != undefined ? obj.value : UI.PREFS[propName];
		
	this.Components[propName] = c;

	c.onClick = function()
	{ 
		UI.PREFS[propName] = c.value;
		if($.level) UI.debug(propName + ": " + c.value, debugTxt); 
	}

	return c;
};

// radiobutton component
/* 
	var radiobuttons = win.add('group');	
	var rb1, rb2, rb3
	rb1 = radiobuttons.addRadioButton ( { name:'rb1', label:'Radiobutton 1', value:prefs.rb1, prefs:prefs, array:['rb1', 'rb2', 'rb3'] } );
	rb2 = radiobuttons.addRadioButton ( { name:'rb2', label:'Radiobutton 2', value:prefs.rb2, prefs:prefs, array:['rb1', 'rb2', 'rb3'] } );
	rb3 = radiobuttons.addRadioButton ( { name:'rb3', label:'Radiobutton 3', value:prefs.rb3, prefs:prefs, array:['rb1', 'rb2', 'rb3'] } );
*/
Object.prototype.addRadioButton = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	
	var c = this.add('radiobutton', undefined, obj.label ? obj.label : propName);
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.value) c.value = obj.value;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	this.Components[propName] = c;

	c.onClick = function()
	{
		// if array of radiobutton variables provided, loop through corresponding preferences in object and update accordingly
		if(obj.array)
		{ 
			for(var i = 0; i < obj.array.length; i++)
			{
				// update preference
				UI.PREFS[ obj.array[i] ] = this.Components[obj.array[i]] == c;
				// set radiobutton value (loop automatically sets other radiobuttons to false)
				this.Components[obj.array[i]].value = this.Components[obj.array[i]] == c; 
			}
		}
		
		if(obj.array && $.level)
		{
			var str = "";
			for(var i = 0; i < obj.array.length; i++)
			{
				var bool = UI.PREFS[ obj.array[i] ];
				str += "  " + obj.array[i] + ": " + (bool ? bool.toString().toUpperCase() : bool);
			}
			UI.debug(propName + ": " + c.value + (str ? "\n[ prefs:" + str + " ]" : ""), debugTxt); 
		}
	}

	return c;
};

// static text component
Object.prototype.addStaticText = function(obj)
{
	// if no object is passed, return a simple vertical spacer
	if(!obj)
	{
		return this.add('statictext');
	}

	// has label?
	if(obj.label)	
	{
		this.add('statictext', undefined, obj.label);
	}

// some textfield properties (such as multiline) need to be specified at the initial moment of creation
// note that multiline:true is not enough to display a paragraph, the height must also be set accordingly.
	var c = this.add('statictext', undefined, obj.text ? obj.text : 'Default Text', {multiline: obj.multiline});
	
	//if(obj.multiline) c.multiline = obj.multiline;
	if(obj.truncate) c.truncate = obj.truncate;
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	//if(obj.alignment) c.alignment = obj.alignment;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	if(obj.justify) c.justify = obj.justify;
	if(obj.style)
	{
		try
		{
			c.graphics.font = obj.style;
		}
	// force default specs in case of a fail
		catch(e)
		{
			c.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 14);
		}
	}
	else
	{
		if(UI.STYLE)
		c.graphics.font = UI.STYLE;
	}

	//c.text = obj.text ? obj.text : 'Default Text';

	return c;
};

// editable text component
// can be automatically tied to a corresponding UI button to browse folder
//	var edittext = container.addEditText( { name:"edittext", text:new Folder(prefs.sourcePath).fsName, prefs:prefs, specs:{browseFile:true/*, browseFolder:true*/}, width:600, label:"Folder:"} );
// (note: if prefsObj has corresponding property, it is updated on the fly by OnChange event)
// 	
Object.prototype.addEditText = function(propName, obj)
{	
	/*
		** bug with file/folder if "~/" ?
		auto-characters: value.toString().length
		if useGroup, option to insert in existing container? (window/panel/group?)
		if label, auto-use group?
	
		*/
	
	var obj = obj != undefined ? obj : {};
	obj.text = obj.text != undefined ? obj.text : UI.PREFS[propName];
	
	// setup
	var isFileObject = false;
	var isFolderObject = false;
	var addIndicator = false;
	var addBrowseButton = false;
	var hasImage = false;
	var imgFile;
	var imgFileExists = false;
	var useGroup = false;
	
	// check for file/folder URI input instructions
	if(obj.specs)
	{
		isFileObject = obj.specs.browseFile;
		isFolderObject = obj.specs.browseFolder;
		addIndicator = obj.specs.addIndicator;
		addBrowseButton = obj.specs.addBrowseButton;
		useGroup = obj.specs.useGroup;
		hasImage = obj.specs.hasImage;
		if(hasImage && obj.specs.imgFile)
		{
			imgFile = new File(obj.specs.imgFile);
			imgFileExists = imgFile.exists;
		}		
	}

	// create group (optional)
	if(useGroup)
	{
		var g = this.add('group');
		
		if(obj.specs.groupSpecs)
		{
			if(obj.specs.groupSpecs.alignment) g.alignment = obj.specs.groupSpecs.alignment;
			if(obj.specs.groupSpecs.orientation) g.orientation = obj.specs.groupSpecs.orientation;
		}
		
		this.Components[propName+'Group'] = g;
	}

	// has label?
	var l;
	var label = obj.label != undefined ? obj.label : propName;
	
	l = useGroup ? g.add('statictext', undefined, label) : this.add('statictext', undefined, label);
		
//~ 		if(useGroup)
//~ 		{
//~ 			l = g.add('statictext', undefined, label);
//~ 		}
//~ 		else
//~ 		{
//~ 			l = this.add('statictext', undefined, label);
//~ 		}
	
	if(UI.STYLE) l.graphics.font = UI.STYLE;
	
// some textfield properties (such as multiline) need to be specified at the initial moment of creation
// note that multiline:true is not enough to display a paragraph, the height must also be set accordingly.
	if(useGroup)
	{
		var c = g.add('edittext', undefined, obj.text != undefined ? obj.text : propName, {multiline:obj.multiline});
	}
	else 
	{
		var c = this.add('edittext', undefined, obj.text != undefined ? obj.text : propName, {multiline:obj.multiline});
	}
	

	// if source/target file/folder needs an 'exists' indication, add read-only checkbox as an indicator next to the edittext component
	if(addIndicator)
	{

		if(useGroup)
		{
			var d = g.add('checkbox', undefined, '');
		}
		else 
		{
			var d = this.add('checkbox', undefined, '');
		}

		d.enabled = false;
		d.value = ( isFolderObject ? new Folder(obj.text) : new File(obj.text) ).exists;
		this.Components[propName+'Indicator'] = d;
	}

	// a pre-configured "Browse..." button can be added
	if(addBrowseButton)
	{
		try
		{

		if(hasImage && imgFileExists)
		{
			// use PNG as button 
			if(useGroup)
			{
				var b = g.add('iconbutton', undefined, imgFile);
			}
			else 
			{
				var b = this.add('iconbutton', undefined, imgFile);
			}
		}
		else
		{
			// regular button
			if(useGroup)
			{
				var b = g.add('button', undefined, 'Browse...');
			}
			else 
			{
				var b = this.add('button', undefined, 'Browse...');
			}
		}
	
		if(obj.specs.buttonSpecs)
		{
			if(obj.specs.buttonSpecs.width) b.preferredSize.width = obj.specs.buttonSpecs.width;
			if(obj.specs.buttonSpecs.height) b.preferredSize.height = obj.specs.buttonSpecs.height;
		}	
	
		this.Components[propName+'BrowseButton'] = b;
		
		// preconfigured button callback
		b.onClick = function()
		{
			// if browsing for folder
			if(obj.specs.browseFolder)
			{
				var defaultFolder = c.text;
				var testFolder = new Folder(c.text);
				if($.level) $.writeln("Browsing for output directory. Default path: " + testFolder.fsName);
				if(!testFolder.exists) defaultFolder = "~";

				var chosenFolder = Folder.selectDialog(c.text, defaultFolder);
				
				if(chosenFolder != null)
				{
					if($.level) UI.debug("chosenFolder: " + chosenFolder.fsName + "\n[ exists: " + chosenFolder.exists + " ]", debugTxt);
					obj.prefs[propName] = chosenFolder;
					c.text = chosenFolder.fsName;
				}
			}
			// if browsing for file
			if(obj.specs.browseFile)
			{
				var defaultFile = c.text;
				var testFile = new File(c.text);
				if($.level) $.writeln("Browsing for file. Default path: " + testFile.parent.fsName);
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
					if($.level) UI.debug("chosenFile: " + chosenFile.fsName + "\n[ exists: " + chosenFile.exists + " ]", debugTxt);
					obj.prefs[propName] = chosenFile;
					c.text = chosenFile.fsName;
				}
			}
			// use onChanging callback so "exists" indicator is properly refreshed after selecting file or folder.
			c.onChanging();
		}
		
	}
	catch(e)
	{
		alert(e)
	}

	}
	
	// oh that's right, edittext component
	c.characters = obj.characters != undefined ? obj.characters : UI.CHARLENGTH;
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	// filter for File/Folder Object
	if( obj.text != undefined ) 
	{		
		// check for "~/" at the beginning of the string
		// this will ensure that such a path will be translated as fsName even if the target does not exist yet
		var userFolder = obj.text.length > 1 && (obj.text[0] == "~" && obj.text[1] == "/") ;
	
		var folder = new Folder(obj.text);
		var file = new File(obj.text);
	
		if(folder.exists || userFolder)
		{
			c.text = folder.fsName;
		}
		else if(file.exists || userFolder)
		{
			c.text = file.fsName;
		}
		else
		{
			c.text = obj.text ;	
		}
	}
	
	this.Components[propName] = c;
	
	// using the file/folder location dialog automatically triggers onChange()
	// workaround is to refer to onChanging function
	c.onChange = function()
	{
		c.onChanging();
	}

	// function that is used when updating textfield
	c.onChanging = function()
	{		
		var folder = new Folder(c.text);
		var file = new File(c.text);
			
		// update object property
		UI.PREFS[propName] = c.text;

		// deal with file/folder existence indicator
		if(isFolderObject || isFileObject)
		{
			var objectExists = (isFolderObject ? new Folder(UI.PREFS[propName]) : new File(UI.PREFS[propName]) ).exists;

			// check for indicator
			if(addIndicator) this.Components[propName+'Indicator'].value = objectExists;
			
			// update preferences object
			obj.prefs[propName] = UI.fsname2uri(c.text);
			if($.level) UI.debug(propName + ": " + c.text + ( "\n[ exists: " + objectExists.toString().toUpperCase() + " ]" ), debugTxt); 
		}
		else
		{
			// update preferences object
			// validate if string or number is needed
			UI.PREFS[propName] = isNaN(c.text) ? c.text : Number(c.text);
			if($.level) UI.debug(propName + ": " + UI.PREFS[propName] + " [" + typeof UI.PREFS[propName] + "]", debugTxt); 
		}
	}

	return c;
};

// dropdownlist component
// (note: if prefsObj has corresponding property, it is updated on the fly by OnChange event)
Object.prototype.addDropDownList = function(propName, obj)
{	
	var obj = obj != undefined ? obj : {};
	var useGroup = false;
	
	if(obj.specs)
	{
		useGroup = obj.specs.useGroup != undefined ? obj.specs.useGroup : false;
	}
	
	// create group (optional)
	if(useGroup)
	{
		var g = this.add('group');
		if(obj.specs.groupSpecs)
		{
		
			if(obj.specs.groupSpecs.alignment) g.alignment = obj.specs.groupSpecs.alignment;
			if(obj.specs.groupSpecs.orientation) g.orientation = obj.specs.groupSpecs.orientation;
		}
		
		this.Components[obj.name+'Group'] = g;
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
			if(UI.STYLE) l.graphics.font = UI.STYLE;
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
	
		c.selection = UI.PREFS[propName+"_ddl_selection"];
	}
	
	if(obj.label2)	
	{
		this.add('statictext', undefined, obj.label2);
	}
		
	this.Components[propName] = c;
	
	c.onChange = function()
	{
		for(var i = 0; i < obj.list.length; i++)
		{
			if(i == parseInt(c.selection))
			{ 
				UI.PREFS[propName+"_ddl_selection"] = i;
				
				if($.level) UI.debug(propName + ": [" + c.selection + "]  " + obj.list[i], debugTxt); 
				break;
			}
		}
	}
	return c;
};

// button component
/*
	EXAMPLES

	var button = container.addButton( {label:"Filter Folder Content"} );
	var iconbutton = container.addButton( {hasImage:true, imgFile:new File("/path/to/file.png")} );
	
	// couple in context with an edittext component in order to automate file/folder location functions
	// prefsObj needs a "specs" property (Object), with a direct reference to an existing edittext var name (textfield:varname), 
	// as well as a String that points to the prefsObj property name (prop:"propertyname")
	// onClick and onChanging callback functions are automatically assigned, and they take care of updating the prefsObj properties.
	
	var sourcepath = container.addEditText( { name:"sourcepath", text:new Folder(prefsObj.sourcepath).fsName, prefs:prefsObj } );		
	var browsebtn = container.addButton( {label:"Browse...", prefs:prefsObj, specs:{ prefs:prefsObj, browseFolder:true, textfield:sourcepath, prop:"sourcepath"} } );
*/
Object.prototype.addButton = function(obj)
{
	if(!obj) return;
	
	if(obj.imgFile)
	{
		// force File
		if( !(obj.imgFile instanceof File) ) obj.imgFile = new File(obj.imgFile);
		
		// add buttonImage support
		if(obj.hasImage && obj.imgFile.exists)
		{
			var c = this.add('iconbutton', undefined, obj.imgFile);
		}
		// fallback in case image does not exist
		else if(obj.hasImage)
		{
			var c = this.add('button', undefined, "[Invalid URL: " + obj.imgFile + "]");
		}
	}
	else 
	{
		var c = this.add('button', undefined, obj.label ? obj.label : "Default Button Text");
	}
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	this.Components[obj.name] = c;
	c = this.Components[obj.name];
	
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
					if($.level) UI.debug("chosenFolder: " + chosenFolder.fsName + " [exists: " + chosenFolder.exists + "]", debugTxt);
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
					if($.level) UI.debug("chosenFile: " + chosenFile.fsName + " [exists: " + chosenFile.exists + "]", debugTxt);
					obj.specs.prefs[obj.specs.prop] = chosenFile;
					obj.specs.textfield.text = chosenFile.fsName;
				}
			}
		}
	}

	return c;
};

Object.prototype.addImage = function(obj)
{
	// if no object is passed, return as simple image placeholder
	if(!obj)
	{
		var c = this.add('image', undefined, undefined);
		c.preferredSize.width = 100;
		c.preferredSize.height = 100;
		return c;
	}

	if(obj.imgFile)
	{
		// if not a file object, force conversion
		if( !(obj.imgFile instanceof File)) obj.imgFile = new File(obj.imgFile);
		
		if(obj.imgFile.exists)
		{
			var c = this.add('image', undefined, obj.imgFile);
		}
		else
		{
			var c = this.add('image', undefined, "[Invalid URL: " + obj.imgFile + "]");
		}
	}
	else return;

	// fallback in case image does not exist

	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	this.Components[obj.name] = c;
	c = this.Components[obj.name];
	
	return c;
};

// slider component
// var slider = container.addSlider( { name:"slider", prefs:prefsObj, value:prefsObj.slider, minvalue:0, maxvalue:100, width:300, specs: { label:"Quality:", prop:"slider"} } );
Object.prototype.addSlider = function(obj)
{
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
	if(obj.disabled) c.enabled = !obj.disabled;

	if(obj.minvalue) c.minvalue = obj.minvalue;
	if(obj.maxvalue) c.maxvalue = obj.maxvalue;	
	if(!obj.width && obj.maxvalue < 1000) c.preferredSize.width = obj.maxvalue - obj.minvalue; // use max value if width is not available
	if(obj.value) c.value = obj.value;
	
	this.Components[obj.name] = c;
	c = this.Components[obj.name];
		
	// if slider has extended specs...
	if(obj.specs)	
	{
		var text = this.add('edittext', undefined, obj.value);
		text.characters = (obj.maxvalue - obj.minvalue).toString().length + 1;
		
		this.Components[obj.specs.prop] = text;
		text = this.Components[obj.specs.prop];
		
		text.onChanging = function()
		{
			var sliderValue = Number(text.text);
			if(sliderValue < obj.minvalue) sliderValue = obj.minvalue;
			if(sliderValue > obj.maxvalue) sliderValue = obj.maxvalue;
			if(!isNaN(sliderValue))
			{
				c.value = sliderValue;
				text.text = sliderValue;
			}
		}
	}

	function _update()
	{
		obj.prefs[obj.name] = Math.round(c.value); 
		if($.level && !obj.specs) UI.debug(obj.name + ": " + obj.prefs[obj.name], debugTxt);
		
		if(obj.specs)
		{
			// update textfield
			text.text = obj.prefs[obj.name];
			
			// also update slider
			var num = Math.round( Number(this.Components[obj.specs.prop].text) );
			obj.prefs[obj.name] = num;
			c.value = num;
			if($.level) UI.debug(obj.name + ": " + num, debugTxt);
		}
	};

	// onChanging might be a bit heavy for CS4+
	c.onChange = function()
	{
		_update();
	}

	return c;
};

// listbox component
/* EXAMPLE
	var listbox = container.addListBox( { name:"listbox", label:"Listbox Component:", prefs:prefsObj, list:["Zero", "One", "Two", "Three"], multiselect:true, width:300, height:100 } );	
*/
Object.prototype.addListBox = function(obj)
{	
	// has label?
	if(obj.label)	
	{
		this.add('statictext', undefined, obj.label);
	}

	var c = this.add('listbox', undefined, obj.list, { multiselect: obj.multiselect ? obj.multiselect : false});
		
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	if(obj.prefs) c.selection = obj.prefs[obj.name];
		
	this.Components[obj.name] = c;
	c = this.Components[obj.name];

	c.onChange = function()
	{
		// build new array based on active selection
		var array = [];
		if($.level) var debugArray = [];
		
		for(var sel = 0; sel < c.selection.length; sel++)
		{
			for(var i = 0; i < obj.list.length; i++)
			{
				if(i == c.selection[sel])
				{ 
					array.push(i);
					if($.level) debugArray.push(c.selection[sel]);
					break;
				}
			}
		}
		
		if(obj.prefs) obj.prefs[obj.name] = array;
		if($.level) UI.debug(obj.name + " selection: " + obj.prefs[obj.name] + " | " + debugArray, debugTxt); 
	}

	// in case of doubleclick...
	c.onDoubleClick = function()
	{
		if($.level) UI.debug("Doubleclicked item: " + obj.list[obj.prefs[obj.name]], debugTxt); 
	}
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
		c.msg.enabled = false;
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
	c = this.Components[obj.name];

	c.onCancel = function()
	{
		c.isDone = true;
		return c.isDone;
	}

//	if(progressBar.isDone) { break;}

	// update progress
	c.addProgress = function(num)
	{	
		if(c.value + num < obj.maxvalue ) c.value += num;
		else c.value = c.maxvalue;
		if($.level) $.writeln("...updating progress bar: " + c.value );	
	}

	// update as percentage?
	c.updateProgress = function(percent)
	{
		c.value = (percent/100) * c.maxvalue; 
		if($.level) $.writeln("Progress: " + Math.round(percent) + " %");	
	}
	
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

// create UI components based on object properties
// supported types: string, number, boolean, array and object
// auto-create panel for sub-object properties?
UI.componentsFromObject = function (obj, container, array, preferRadiobuttons)
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
							c.value = UI.PREFS[cName] != undefined ? UI.PREFS[cName] : false;
							
							if(pushToArray) array.push(c);
						}
					}
					// otherwise create dropdownlist
					else
					{
						if($.level) $.writeln("CREATING DROPDOWNLIST");
						
						var cName = property;
						
						c.selection = UI.PREFS[cName];
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
					
					UI.componentsFromObject(value, p, array);
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
	functions borrowed from Xbytor's Stdlib.js
*/

throwFileError = function(f, msg)
{
	if(msg == undefined) msg = ''; 
	throw msg + '\"' + f + "\": " + f.error + '.';
};

UI.convertFptr = function(fptr)
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

UI.writeToFile = function(fptr, str, encoding)
{
	var file = UI.convertFptr(fptr);
	if(!file.parent.exists)
	{	file.parent.create();}

	file.open("w") || throwFileError(file, "Unable to open output file "); 
	if (encoding)
	{file.encoding = encoding;}
	file.write(str); 
	file.close();
};

UI.readFromFile = function(fptr, encoding)
{
	var file = UI.convertFptr(fptr);

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
UI.toIniString = function(obj)
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
		else if( typeof idx == "object" )
		{
			// if object has a length, it's an array:
			if(idx.length)
			{
				str += (idx + ": [" + val.toString() + "]\n");
			}
			// otherwise ignore (for now)
			else
			{
				
			}
		}
	} 
	return str;
};

// fromIniString adjustments (type: true/false, auto-type-conversion)
UI.fromIniString=function(str,obj, type)
{
	var type = type != undefined ? type : false;
	
	if(!obj)
	{	obj={} }
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
		
		// this piece always results in typeof string
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
		
			// case for Arrays: if first and last characters are brackets...
			else if( value[0] == "[" && value[value.length-1] == "]")
			{			
				// trim brackets from string
				value = value.replace('[', '');
				value = value.replace(']', '');
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
				if(value.length > 1 && ( (value[0] == "0" || value[0] == ".") && (value[1] != "." || value[1].toLowerCase() == "x") ) )
				{
					obj[prop] = value;
				}
				// else do force number
				else
				{
					obj[prop] = Number(value);
				}
			}
			
			// otherwise just leave as String
			else obj[prop] = value;
		}
		
	}
	if($.level) UI.reflectProperties(obj, "\n[READING FROM INI STRING:]");
	return obj
};

UI.readIniFile = function(fptr, obj, type)
{
	var fptr = fptr != undefined ? fptr : UI.INIFILE;
	var obj = obj != undefined ? obj : UI.PREFS;
	var type = type != undefined ? type : UI.TOOLNAME;
	
	if(!obj)
	{
		obj = {};
	}

	fptr = UI.convertFptr(fptr);
	
	if(!fptr.exists)
	{
		return obj;
	}

	var str = UI.readFromFile(fptr,type);
		
	return UI.fromIniString(str,obj,type);
};

UI.writeIniFile=function(fptr, obj, header)
{
	var fptr = fptr != undefined ? fptr : UI.INIFILE;
	var obj = obj != undefined ? obj : UI.PREFS;
	var header = header != undefined ? header : UI.TOOLNAME;
	
	// validate header with # and carriage return if needed
	if(header)
	{
		if(header[0] != "#") header = "#" + header;
		if(header[header.length-1] != "\n") header += "\n";
	}
	var str = header?header:'';
	str += UI.toIniString(obj);
	
	if($.level)
	{
		UI.reflectProperties(obj, "\n[WRITING TO INI STRING:]");
	}
	UI.writeToFile(fptr,str);
};

// XBytor's string trim
String.prototype.trim = function()
{
	return this.replace(/^[\s]+|[\s]+$/g,'')
};

if($.level)
{
	// let's confirm that the file was properly included
	$.writeln("\nUI.js successfully loaded");
}
//EOF
