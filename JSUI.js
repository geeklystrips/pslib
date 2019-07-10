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
	*/

/*
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
JSUI.version = "0.89";

// do some of the stuff differently if operating UI dialogs from ESTK
JSUI.isESTK = app.name == "ExtendScript Toolkit";
JSUI.isPhotoshop = app.name == "Adobe Photoshop";
JSUI.isCS6 = JSUI.isPhotoshop ? app.version.match(/^13\./) != null : false;

/*	 system properties	*/
JSUI.isWindows = $.os.match(/windows/i) == "Windows";
JSUI.isWin7 = $.os.match(/windows/i) == "Windows" ? $.os.match(" 6.1 Service Pack ") != null : false;
JSUI.isWin10 = $.os.match(/windows/i) == "Windows" ? $.os.match(" 6.2 Service Pack ") != null : false;

JSUI.TOOLNAME = "DEFAULTNAME";	
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

JSUI.populateINI = function()
{
	JSUI.INIFILE = new File(JSUI.USERPREFSFOLDER + "/" + JSUI.TOOLSPREFSFOLDERNAME + "/" + JSUI.TOOLNAME + ".ini");
	JSUI.URI = JSUI.getScriptFolder();
}

/* INI prefs framework	*/
JSUI.PREFS = {};

/*  Layout and graphics  */
JSUI.SPACING = (JSUI.isWindows ? 3 : 1);
JSUI.dark = [0.33, 0.33, 0.33];
JSUI.light = [0.86, 0.86, 0.86];

/* failsafe for cases where the UI framework is used without a debugTxt dialog component	
 if this variable is not replaced, calls by regular functions to modify its state should not cause problems	*/
var debugTxt = {};

/* these functions return specs relative to JSUI.js (unless included files are flattened)	*/
JSUI.getScriptFolder = function()
{
	return JSUI.getScriptFile().parent;
};

JSUI.getScriptFileName = function()
{
	var f = JSUI.getScriptFile();
	return (f ? f.absoluteURI : '');
};

JSUI.getScriptFile = function()
{
	var path = $.fileName;
	return new File(path);
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

/* convert file system name to URI	"C:\Program Files\Adobe" becomes "c/Program Files/Adobe"*/
JSUI.fsname2uri = function(fsname) 
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

/* convert URI name to file system name	"c/Program Files/Adobe" becomes "C:\Program Files\Adobe"	*/
JSUI.uri2fsname = function(uri) 
{
	if(uri instanceof Folder) var fsname = new Folder(uri);
	else	var fsname = new File(uri);
	return fsname.fsName;
};

/* print object properties to javascript console (with ExtendScript Toolkit only)	*/
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
		// if textfield is provided
		if(textfield != undefined)
		{
			textfield.text = str;
		}
		// otherwise just assume 
		else
		{
			debugTxt.text = str
		}
		$.writeln(str);
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

JSUI.zeropad = function(str)
{
	/* padding string with zeroes	*/
	return (str.length < 2 ? "000" + str :  (str.length < 3 ? "00" + str : (str.length < 4 ? "0" + str : (str) ) ) ); // 40 becomes "0040"
};

/* supercharge object type to store interface element functions (hi X! )	*/
Object.prototype.Components = new Array(); 

/* Graphics treatment for CS6 (Dialog Window)*/
Object.prototype.dialogDarkMode = function()
{
	if(JSUI.isCS6)
	{
		this.graphics.foregroundColor = this.graphics.newPen (this.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
		try
		{
			this.graphics.backgroundColor = this.graphics.newBrush (this.graphics.PenType.SOLID_COLOR, [0.27, 0.27, 0.27], 1);
		}
		catch(e)
		{

		}
	}
};

/* Graphics treatment for CS6 */
Object.prototype.darkMode = function()
{
	if(JSUI.isCS6)
	{
		this.graphics.foregroundColor = this.graphics.newPen (this.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
		try
		{
			this.graphics.backgroundColor = this.graphics.newBrush (this.graphics.PenType.SOLID_COLOR, JSUI.dark, 1);
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
	/*	return this.Components[obj.name];	*/
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

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	
	if(obj.spacing) c.spacing = obj.spacing;
	if(obj.margins) c.margins = obj.margins;

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
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;

	if(JSUI.isCS6)
	{
		c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
	}
	
	this.Components[obj.name] = c; 
	/*	return this.Components[obj.name];	*/
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

	if(JSUI.isCS6) c.darkMode();
	// {
	// 	c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
	// }

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

	if(JSUI.isCS6) c.darkMode();
	// {
	// 	c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
	// }

	return c;
};

/* divider component	*/
Object.prototype.addDivider = function(obj)
{
	if(!obj) var obj = {};
	var c = this.add("panel");
	c.alignChildren = 'fill';
	c.orientation = obj.orientation ? obj.orientation : 'row';

	if(JSUI.isCS6) c.darkMode();
	// {
	// 	c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
	// }

	return c;
};

/* checkbox image component	*/
Object.prototype.addCheckBox = function(propName, obj)
{
	if(!obj) return;
	var c = this.add('checkbox', undefined, obj.label ? obj.label : "Default Checkbox Text", {name: obj.name});
	c.value = obj.value != undefined ? obj.value : JSUI.PREFS[propName];

	if(JSUI.isCS6) c.darkMode();
	// {
	// 	c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
	// }

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

	this.Components[obj.name] = c; 
	return c;
};

/* 
	addToggleIconButton

	usage:
	- the first parameter must be a string that matches the name of the variable
	- if that name matches a property which belongs to the JSUI.PREFS object, this property will be bound to the value of the checkbox/radiobutton
	- important: binding will not happen if the variable name does not match the string variable
	- the preset value can otherwise be passed as part of the obj parameter { value: true/false }
	- if an array of variable names (strings) is provided, the radiobutton logic will be applied automatically
	- images are required (minimum of one per component, full support requires six per component)
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
	if(!obj) return;

	var testImage, imgFileUp, imgFileOver, imgFileDown, disabledImgFile, disabledImgFileUp, disabledImgFileOver;
	var imgFileUpExists, imgFileOverExists, imgFileDownExists, disabledImgFileExists, disabledImgFileOver = false;
	var normalState, overState, downState = null;

	if(obj.imgFile != undefined)
	{
		// if not a valid file URI, attempt to make it a file object
		if( !(obj.imgFile instanceof File) )
		{
			testImage = new File(obj.imgFile);

			// if still not valid, add absolute path for parent script
			if(!testImage.exists)
			{
				// this will make it support cases where obj.imgFile parameter is passed as "/img/file.png" or "file.png"
				testImage = new File(JSUI.URI + (obj.imgFile.toString()[0] == "/" ? "" : "/") + obj.imgFile);

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
			imgFileUp = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_up.png"));
			imgFileOver = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_over.png"));
			imgFileDown = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_down.png"));
			
			disabledImgFile = new File(obj.imgFile.toString().replace(".png", "_disabled.png") );
			disabledImgFileOver = new File(disabledImgFile.toString().replace(/\.(png)$/i, "_over.png"));

			imgFileUpExists = imgFileUp.exists;
			imgFileOverExists = imgFileOver.exists;
			imgFileDownExists = imgFileDown.exists;

			disabledImgFileExists = disabledImgFile.exists;
			disabledImgFileOverExists = disabledImgFileOver.exists;

			if($.level)
			{
				$.writeln( (obj.imgFile.exists ? "    Found: " : "NOT FOUND: ") + obj.imgFile.name);
				$.writeln( (imgFileUpExists ? "    Found: " : "NOT FOUND: ") + imgFileUp.name);
				$.writeln( (imgFileOverExists ? "    Found: " : "NOT FOUND: ") + imgFileOver.name);
				$.writeln( (imgFileDownExists ? "    Found: " : "NOT FOUND: ") + imgFileDown.name);				

				$.writeln( (disabledImgFileExists ? "    Found: " : "NOT FOUND: ") + disabledImgFile.name);
				$.writeln( (disabledImgFileOverExists ? "    Found: " : "NOT FOUND: ") + disabledImgFileOver.name);
			}
		}
	}

	// if image file is found, add iconbutton
	if(obj.imgFile.exists)
	{
		if($.level) $.writeln("Adding [" + propName + "] toggle iconbutton" + (obj.array ? ' with radiobutton behavior' : '') + "\n");
		var c = this.add('iconbutton', undefined, ScriptUI.newImage(obj.imgFile, imgFileUp.exists ? imgFileUp : obj.imgFile, imgFileDown.exists ? imgFileDown : obj.imgFile, imgFileOver.exists ? imgFileOver : obj.imgFile));
		//var c = this.add('iconbutton', undefined, ScriptUI.newImage(obj.imgFile, obj.imgFile, obj.imgFile, obj.imgFile));
	}
	// at this point, if imgFile does not exist, fallback to checkbox or radiobutton component 
	else
	{
		if($.level) $.writeln("Fallback: " + (obj.array ? 'radiobutton' : 'checkbox') + "\n");
		return (obj.array ? this.addRadioButton(propName, obj) : this.addCheckBox(propName, obj) );
	}

	if(obj.width != undefined) c.preferredSize.width = obj.width;
	if(obj.height != undefined) c.preferredSize.height = obj.height;

	if(obj.alignment != undefined) c.alignment = obj.alignment;

	if(obj.helpTip != undefined) c.helpTip = obj.helpTip;
	if(obj.disabled != undefined) c.enabled = !obj.disabled;
	
	// manually assign new component to dialog's variable list
	this.Components[propName] = c;

	// fix for unwanted borders and outlines (CS6 & CC+) -- requires onDraw + eventListener
	if(JSUI.isCS6)
	{
		var refImage = ScriptUI.newImage(obj.imgFile);

		// temporary assignment
		c.image = refImage;
		c.size = refImage.size;

		normalState, overState, downState = ScriptUI.newImage(obj.imgFile);

		c.onDraw = function (state)
		{  
			c.graphics.drawImage(c.image,0,0);  
		}  

		// mouse events
		var mouseEventHandler = function(event)
		{
			switch (event.type)
			{  
				case 'mouseover':   
					event.target.image = overState;  
					break;  
				case 'mouseout':   
					event.target.image = normalState;  
					break;  
				case 'mousedown':   
					event.target.image = downState;  
					break;  
				case 'mouseup':   
					event.target.image = overState;  
					break;  
				default:   
					event.target.image = normalState;  
			}  
			event.target.notify("onDraw");  
		}  
	
		// event listeners
		c.addEventListener('mouseover', mouseEventHandler, false);  
		c.addEventListener('mouseout', mouseEventHandler, false);  
		c.addEventListener('mousedown', mouseEventHandler, false);  
		c.addEventListener('mouseup', mouseEventHandler, false);  
	}

	c.onClick = function()
	{ 
		var currentValue = JSUI.PREFS[ propName ];

		if(obj.array != undefined)
		{ 
			//in the case where the initial value of the clicked object is true, skip the whole thing
			if(currentValue)
			{

			}
			else
			{
				for(var i = 0; i < obj.array.length; i++)
				{
					// determine if the current array index matches the current component
					var component = this.Components[obj.array[i]];
					var isCurrentComponent = (component == c); 

					// store current component value
					//var currentComponentValue = JSUI.PREFS[ obj.array[i] ];

					// update preferences value ONLY if different
					if(JSUI.PREFS[ obj.array[i] ] != isCurrentComponent) JSUI.PREFS[ obj.array[i] ] = isCurrentComponent;
					
					// update visuals only if value changed
					// if(currentValue != JSUI.PREFS[ obj.array[i] ]) this.Components[obj.array[i]].update();
					// if(currentValue != currentComponentValue) this.Components[obj.array[i]].update();

					this.Components[obj.array[i]].update();	
				}
				if($.level) JSUI.debug(propName + ": " + JSUI.PREFS[propName]); 
			}
		}
		else
		{
			JSUI.PREFS[propName] = !JSUI.PREFS[propName];
			c.update();
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
			if($.level) JSUI.debug((str ? "\n[" + str + " ]" : "") + "\n" + propName + ": " + JSUI.PREFS[propName] + "\ncomponent.image: " + c.image); 
		}
		if(JSUI.autoSave) JSUI.saveIniFile();
		if(obj.onClickFunction) obj.onClickFunction();
	}
	
	// update callback: update the UI based on the state of preferences object
	c.update = function()
	{
		if(JSUI.isCS6)
		{
			// update ScriptUI images used by mouseevents
			normalState = ScriptUI.newImage( JSUI.PREFS[propName] ? obj.imgFile : (disabledImgFileExists ? disabledImgFile : obj.imgFile) );
			overState = ScriptUI.newImage( JSUI.PREFS[propName] ? (imgFileOverExists ? imgFileOver : obj.imgFile) : (disabledImgFileOverExists ? disabledImgFileOver : obj.imgFile) );
			downState = ScriptUI.newImage( imgFileDownExists ? imgFileDown : obj.imgFile );
			//$.writeln( (disabledImgFileOverExists ? "    Found: " : "NOT FOUND: ") + disabledImgFileOver.name);

			if(c.image != normalState) c.image = normalState;
		
			JSUI.debug("\n\t" + propName + ": update() " + JSUI.PREFS[propName] + "\n\tcomponent.image: " + c.image + "\n");//  + "\t\tnormalState: " + normalState + "\n\t\toverState:" + overState + "\n\t\tdownState: " + downState);
		}
		else
		{
			c.image = JSUI.PREFS[propName] ? ScriptUI.newImage(obj.imgFile, imgFileUpExists ? imgFileUp : obj.imgFile, imgFileDownExists ? imgFileDown : obj.imgFile, imgFileOverExists ? imgFileOver : obj.imgFile) : ScriptUI.newImage(disabledImgFile, disabledImgFile, imgFileDownExists ? imgFileDown : obj.imgFile, disabledImgFileOverExists ? disabledImgFileOver : obj.imgFile);	
		}
	};

	c.update();

	return c;
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

	if(JSUI.isCS6) c.darkMode();
	
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
	var c = this.add('statictext', undefined, obj.text ? obj.text : 'Default Text', {multiline: obj.multiline});
	
	//if(obj.multiline) c.multiline = obj.multiline;
	if(obj.truncate) c.truncate = obj.truncate;
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	//if(obj.alignment) c.alignment = obj.alignment;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	if(obj.justify) c.justify = obj.justify;

	if(JSUI.isCS6) c.darkMode();
	// {
	// 	c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
	// }

	if(obj.style && JSUI.isCS6)
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
		if(JSUI.STYLE)
		c.graphics.font = JSUI.STYLE;
	}

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
	obj.text = obj.text != undefined ? obj.text : JSUI.PREFS[propName];
	
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
//~ 	if(obj != undefined)
//~ 	{
		if(obj.specs)
		{
			isFileObject = obj.specs.browseFile;
			isFolderObject = obj.specs.browseFolder;
			//alert(isFileObject + "   " + isFolderObject);
			//alert(obj.text + "  isFileObject: " + isFileObject + " instanceof File: " + (File(obj.text) instanceof File) +"\n" + obj.text + "  isFolderObject: " + isFolderObject+ " instanceof Folder: " + (Folder(obj.text) instanceof Folder) );
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
//~ 	}

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
	}
	
// some textfield properties (such as multiline) need to be specified at the initial moment of creation
// note that multiline:true is not enough to display a paragraph, the height must also be set accordingly.
	if(useGroup)
	{
		var c = g.add('edittext', undefined, obj.text != undefined ? decodeURI (obj.text) : propName, {multiline:obj.multiline});
	}
	else 
	{
		var c = this.add('edittext', undefined, obj.text != undefined ? decodeURI (obj.text) : propName, {multiline:obj.multiline});
	}

	if(JSUI.isCS6) c.dialogDarkMode();
	

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
		d.helpTip = "URI integrity validator:\nIndicates whether or not specified location exists";
		
		this.Components[propName+'Indicator'] = d;
	}

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
					//var b = g.add('iconbutton', undefined, ScriptUI.newImage(imgFile, imgFile, imgFile, imgFile));
					var b = g.add('iconbutton', undefined, ScriptUI.newImage(imgFile, imgFileUp.exists ? imgFileUp : imgFile, imgFileDown.exists ? imgFileDown : imgFile, imgFile));
				}
				else 
				{
			//		var b = this.add('iconbutton', undefined, ScriptUI.newImage(imgFile, imgFile, imgFile, imgFile));
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
			}
		
			b.helpTip = obj.specs.browseFolder ? "Browse for location URI" :  "Browse for file URI";
		
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
					if($.level) $.writeln("Browsing for directory. Default path: " + testFolder.fsName);
					if(!testFolder.exists) defaultFolder = "~";

					var chosenFolder = Folder.selectDialog(c.text, defaultFolder);
					
					if(chosenFolder != null)
					{
						JSUI.debug("chosenFolder: " + chosenFolder.fsName + "\n[ exists: " + chosenFolder.exists + " ]");
						JSUI.PREFS[propName] = encodeURI (chosenFolder) ;
						c.text = chosenFolder.fsName;
					}
					else
					{
						/*	user either closed the window or pointed to an invalid location/special folder
							*/
						JSUI.debug("User either closed the browse dialog without chosing a target folder, or pointed to an invalid resource"); 
											
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
						JSUI.debug("chosenFile: " + chosenFile.fsName + "\n[ exists: " + chosenFile.exists + " ]");
						JSUI.PREFS[propName] = encodeURI (chosenFile) ;
						c.text = chosenFile.fsName;
					}
				}
				// use onChanging callback so "exists" indicator is properly refreshed after selecting file or folder.
				c.onChanging();
			}
			
		}
		catch(e)
		{
			alert(e);
		}

	//
	}
	
	// oh that's right, this is still technically an edittext component
	/*c.characters = obj.characters != undefined ? obj.characters : JSUI.CHARLENGTH;*/
	if(obj.characters) c.characters = obj.characters;
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;

	if(JSUI.isCS6) c.darkMode();
	// {
	// 	// c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
	// 	// c.graphics.backgroundColor = c.graphics.newBrush (c.graphics.PenType.SOLID_COLOR, JSUI.dark, 1);
	// }
	
	// filter for File/Folder Object
	if( obj.text != undefined ) 
	{		
		// check for "~/" at the beginning of the string
		// this will ensure that such a path will be translated as fsName even if the target does not exist yet
		
		var userFolder = obj.text.length > 1 && (obj.text[0] == "~" && obj.text[1] == "/") ;
	
		var folder = new Folder(obj.text);
		var file = new File(obj.text);
	
		if(folder.exists)// || userFolder)
		{
			c.text = folder.fsName;
		}
		else if(file.exists)// || userFolder)
		{
			c.text = file.fsName;
		}
		else
		{
		// no, hold on, this is problematic, causes addition of "C:\Program Files\Adobe\Adobe Photoshop CS6 (64 Bit)\" all over the place?
		//if(isFolderObject || isFileObject)
				
//~ 			c.text = File(obj.text).fsName;	
			c.text = decodeURI(obj.text);	
		}
	}
	
	this.Components[propName] = c;
	
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
		
		JSUI.PREFS[propName] = encodeURI (c.text);

		// deal with file/folder existence indicator
		if(isFolderObject || isFileObject)
		{
			var objectExists = (isFolderObject ? new Folder(JSUI.PREFS[propName]) : new File(JSUI.PREFS[propName]) ).exists;

			// check for indicator
			if(addIndicator) this.Components[propName+'Indicator'].value = objectExists;
			
			// update preferences object
			JSUI.PREFS[propName] = encodeURI(JSUI.fsname2uri(c.text));
			JSUI.debug(propName + ": " + c.text + ( "\n[ exists: " + objectExists.toString().toUpperCase() + " ]" )); 
		}
		else
		{
			// update preferences object
			// validate if string or number is needed
			
			// if the edittext field contains "0x" we are expected to leave as String instead of automatically converting to Number
			if(c.text.trim().match(/0x/i) != null)
			{
				JSUI.PREFS[propName] = encodeURI (c.text);
				JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
			}
			else
			{
				JSUI.PREFS[propName] = isNaN(c.text) ? encodeURI (c.text) : Number(c.text);
				JSUI.debug(propName + ": " + JSUI.PREFS[propName] + " [" + typeof JSUI.PREFS[propName] + "]"); 
			}
		}
	}

	c.update = function()
	{
//~ 		c.onChanging();
		c.text = File(JSUI.PREFS[propName]).fsName;		
	}

	return c;
};

/* add browse for folder edittext+browsebutton combo
	var browseFolder = win.addBrowseForFolder("browseFolder");
*/
Object.prototype.addBrowseForFolder = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addEditText(propName, { text: obj.text != undefined ? obj.text : new Folder(JSUI.PREFS[propName].fsName), label:obj.label, specs:{ browseFolder:true, addIndicator:true, addBrowseButton:true, useGroup:true, groupSpecs:{alignment:'right'}, characters: obj.characters ? obj.characters : 50}} );

	return c;
};

/* add browse for folder edittext+browsebutton combo
	var browseFile = win.addBrowseForFile("browseFile");
*/
Object.prototype.addBrowseForFile = function(propName, obj)
{
	var obj = obj != undefined ? obj : {};
	var c = this.addEditText(propName, { text: obj.text != undefined ? obj.text : JSUI.PREFS[propName], label:obj.label, specs:{ browseFile:true, addIndicator:true, addBrowseButton:true, useGroup:true, groupSpecs:{alignment:'right'}, hasImage:true, imgFile: (JSUI.URI + "/img/BrowseForFile.png") }, characters: obj.characters != undefined ? obj.characters : 75} );
//~ 	var browseForFile = destinationPanel.addEditText("browseForFile", { text: browseForFile, label:"FILE:", specs:{ browseFile:true, addIndicator:true, addBrowseButton:true, useGroup:true, groupSpecs:{alignment:'right'} }, characters:75} );

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
		
			if(obj.specs.groupSpecs.alignment) g.alignment = obj.specs.groupSpecs.alignment;
			if(obj.specs.groupSpecs.orientation) g.orientation = obj.specs.groupSpecs.orientation;
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
		var testImage;

		// if not a valid file URI, attempt to make it a file object
		if( !(obj.imgFile instanceof File) )
		{
			testImage = new File(obj.imgFile);

			// if still not valid, add absolute path for parent script
			if(!testImage.exists)
			{
				// this will make it work if obj.imgFile parameter was something like "/img/file.png" or "file.png"
				testImage = new File(JSUI.getScriptFolder() + (obj.imgFile.toString()[0] == "/" ? "" : "/") + obj.imgFile);
				if(testImage.exists)
				{
					obj.imgFile = testImage;
				}
			}
		}
		
		// add buttonImage support
		if(obj.imgFile.exists)
		{
			var imgFileUp = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_up.png"));
			var imgFileOver = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_over.png"));
			var imgFileDown = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_down.png"));

			var c = this.add('iconbutton', undefined, ScriptUI.newImage(obj.imgFile, imgFileUp.exists ? imgFileUp : obj.imgFile, imgFileDown.exists ? imgFileDown : obj.imgFile, imgFileOver.exists ? imgFileOver : obj.imgFile));
			
			if(JSUI.isCS6)
			{
				var refImage = ScriptUI.newImage(obj.imgFile);

				// temporary assignment
				c.image = refImage;
				c.size = refImage.size;

				// fix for unwanted borders and outlines (CS6 & CC+) -- requires onDraw + eventListener
				var normalState, overState, downState = ScriptUI.newImage(obj.imgFile);

				// update ScriptUI images used by mouseevents
				normalState = ScriptUI.newImage( obj.imgFile );
				overState = ScriptUI.newImage( imgFileOver.exists ? imgFileOver : obj.imgFile );
				downState = ScriptUI.newImage( imgFileDown.exists ? imgFileDown : obj.imgFile );

				if(c.image != normalState) c.image = normalState;

				c.onDraw = function (state)
				{  
					c.graphics.drawImage(c.image,0,0);  
				}  

				// mouse events
				var mouseEventHandler = function(event)
				{
					switch (event.type)
					{  
						case 'mouseover':   
							event.target.image = overState;  
							break;  
						case 'mouseout':   
							event.target.image = normalState;  
							break;  
						case 'mousedown':   
							event.target.image = downState;  
							break;  
						case 'mouseup':   
							event.target.image = overState;  
							break;  
						default:   
							event.target.image = normalState;  
					}  
					event.target.notify("onDraw");  
				}  
			
				// event listeners
				c.addEventListener('mouseover', mouseEventHandler, false);  
				c.addEventListener('mouseout', mouseEventHandler, false);  
				c.addEventListener('mousedown', mouseEventHandler, false);  
				c.addEventListener('mouseup', mouseEventHandler, false);  
			}
		}
		// fallback in case image does not exist
		else 
		{
			var c = this.add('button', undefined, "[Invalid URL: " + obj.imgFile + "]");
		}
	}
	else 
	{
		if(obj.name != undefined)
		{
			var c = this.add('button', undefined, obj.label ? obj.label : "Default Button Text", {name: obj.name});
		}
		else
		{
			var c = this.add('button', undefined, obj.label ? obj.label : "Default Button Text");
		}
	}
	
	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	if(obj.disabled) c.enabled = !obj.disabled;
	
	this.Components[obj.name] = c;
	
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

	var testImage, imgFileUp;
	var imgFileUpExists = false;
	
	if(obj.imgFile != undefined)
	{
		// if not a valid file URI, attempt to make it a file object
		if( !(obj.imgFile instanceof File)) 
		{
			testImage = new File(obj.imgFile);

			if(!testImage.exists)
			{
				// this will make it support cases where obj.imgFile parameter is passed as "/img/file.png" or "file.png"
				testImage = new File(JSUI.URI + (obj.imgFile.toString()[0] == "/" ? "" : "/") + obj.imgFile);

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

			// find out whether a [imgFile] _up.png is present
			if(obj.imgFile.exists)
			{
				imgFileUp = new File(obj.imgFile.toString().replace(/\.(png)$/i, "_up.png"));
				imgFileUpExists = imgFileUp.exists;

				if($.level)
				{
					$.writeln( (obj.imgFile.exists ? "    Found: " : "NOT FOUND: ") + obj.imgFile.name);
					$.writeln( (imgFileUpExists ? "    Found: " : "NOT FOUND: ") + imgFileUp.name);
				}
			}

			if(obj.imgFile.exists)
			{
				var c = this.add('image', undefined, ScriptUI.newImage(obj.imgFile, imgFileUp.exists ? imgFileUp : obj.imgFile, obj.imgFile));
			}
			else
			{
				
				// fallback in case image does not exist
				var c = this.add('statictext', undefined, "[Invalid URI: " + obj.imgFile + "]");
			}
		}
	}
	else return;

	if(obj.width) c.preferredSize.width = obj.width;
	if(obj.height) c.preferredSize.height = obj.height;
	if(obj.alignment) c.alignment = obj.alignment;
	if(obj.helpTip) c.helpTip = obj.helpTip;
	
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
		if(JSUI.isCS6) text.darkMode();
		
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

		
	this.Components[propName] = c;

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
						if($.level) debugArray.push(c.selection[sel]);
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

	// in case of doubleclick (not useful for now)
	c.onDoubleClick = function()
	{
		var selectionArr = c._buildArray();
		JSUI.PREFS[propName] = selectionArr[0];

		JSUI.debug("Doubleclicked item: " + ($.level ? selectionArr[1] : [])); 
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
		c.msg.enabled = false;
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
	}

//	if(progressBar.isDone) { break;}

	// update progress
	c.addProgress = function(num)
	{	
		if(c.value + num < obj.maxvalue ) c.value += num;
		else c.value = c.maxvalue;
		if($.level) $.writeln("...updating progress bar: " + c.value );	
			//win.layout.layout(true);
	}

	// update as percentage?
	c.updateProgress = function(percent)
	{
		c.value = (percent/100) * c.maxvalue; 
		if($.level) $.writeln("Progress: " + Math.round(percent) + " %");	
			//win.layout.layout(true);
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

Object.prototype.addDeleteINIButton = function()
{
	var c = this.addButton( { name:"deleteinifile", label: "[DEL]", helpTip: "Remove current settings file from system"} );
			
	c.onClick = function()
	{
		JSUI.deleteIniFile();
	};

	return c;
};

Object.prototype.addOpenINILocationButton = function()
{
	var c = this.addButton( { name:"openinifilelocation", label: "[OPEN]", helpTip: "Reveal settings file location in " + (JSUI.isWindows ? "Windows Explorer" : "Finder")} );
			
	c.onClick = function()
	{
		JSUI.openIniFileLocation();
	};
	
	return c;
};

Object.prototype.addSaveSettingsButton = function()
{
	var c = this.addButton( { name:"saveinifile", label: "Save Settings", imgFile: "/img/SaveSettings.png", helpTip: "Save current settings" } );
			
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

							if(JSUI.isCS6)
							{
								// c.graphics.foregroundColor = c.graphics.newPen (c.graphics.PenType.SOLID_COLOR, JSUI.light, 1);
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
	functions borrowed from Xbytor's Stdlib.js
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
	{file.encoding = encoding;}
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
			if(idx == "textureid") alert("empty: " + idx + ": " + val);
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

// fromIniString adjustments (type: true/false, auto-type-conversion)
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
	if($.level) JSUI.reflectProperties(obj, "\n[READING FROM INI STRING:]");
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
	
 	if($.level)
 	{
 		JSUI.reflectProperties(obj, "\n[WRITING TO INI STRING:]");
 	}
	JSUI.writeToFile(fptr,str);
//	alert(fptr);
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
	//alert(JSUI.INIFILE.fsName);
	JSUI.debug("Opening INI file location: " + JSUI.INIFILE.parent.fsName);

	try
	{
		JSUI.INIFILE.parent.execute();	
	}
	catch(e)
	{
		alert("Error deleting settings file:\n\n" + JSUI.INIFILE.paren.fsName + "\n\n" + e);
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
	while(true)
	{
		var sr = Math.sqrt(n);
		if(Math.floor(sr) != sr)
		{	
			return false;
		}
		else if(sr == 2)
		{
			return true;
		}
		else
		{
			n = sr;
		}
	}
};

// get next value
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

// get previous  value
JSUI.getPreviousPow2 = function(n)
{
	var p = 2;
	n = Math.floor(n);
	while(n >= p)
	{
		p = p * 2;
	}
	return p / 2;
};

// get previous  value
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

/* this returns Photoshop's full active document path without building a histogram + bypasses the 'document not yet saved' exception)*/
JSUI.getDocumentFullPath = function()
{
	if(JSUI.isPhotoshop)
	{		
		var ref = new ActionReference();
		ref.putProperty(cTID('Prpr'), cTID('FilR'));
		ref.putEnumerated(cTID('Dcmn'), cTID('Ordn'), cTID('Trgt'));
		var desc = executeActionGet(ref);
		return desc.hasKey(cTID('FilR')) ? desc.getPath(cTID('FilR')) : undefined;
	}
	else
	{
		return;
	}
};

// DEBUG AREA

if($.level)
{
	// let's confirm that the file was properly included
	$.writeln("\nJSUI.js successfully loaded by " + app.name);
}
//EOF
