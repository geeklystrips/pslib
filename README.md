# pslib
ExtendScript functions for Adobe Photoshop, Adobe Illustrator and Adobe Bridge.

- Store custom UI component values and file IO dependencies to INI/JSON/XML
- Display colorpickers

----

	This library was put together to help with prototyping UI in a context where I felt like I was 
	coding the same things over and over again to present information to the user. While it can be 
	handy as a resource for reading/writing text files and a workaround for some limitations of ES3  
	(ECMAScript3, deprecated in 2009) in a space that is independant from the Flash-era and HTML5 
    CEP ecosystem, the library has definitely been showing its age.	Its weaknesses are as follow:

	- Not the lightest footprint
    - Autosave on UI component values is not perfs friendly (sorry) 
	- Potential conflicts with String/Array/Number/Object custom methods (poor Object, poor debugger)
	- All-caps variable names are not necessarily constants (I am still learning) 

    This being said, enjoy! :)

----

	
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

		- adding basic JSON implementation
			JSUI.readJSONfile()
			JSUI.writeJSONfile()
			JSUI.toJSONstring()

		- adding Illustrator support to JSUI.prompt()
		- bugfix/workaround for JSUI.createDialog() to simulate imageSize array in cases where image file does not exist
		- workaround for addImage() to actually display invalid URI message instead of crashing
		- addEditText() fix for width vs characters property in a context where the parent container has alignChildren set to "fill"

	0.9787
		- adding JSUI.saveJSONfile() wrapper
		- adding basic XML implementation
			JSUI.toXML() (serializes object to XML structure)
			JSUI.writeXMLfile()
			JSUI.saveXMLfile() (wrapper)
			JSUI.XMLfromFile() // load XML structure from existing file
	
	0.9789
		- Tweaks to pow2/multx math logic
		- adding mult4/mult8/mult16/mult32 validation functions
		- deprecating JSUI.toJSONstring()/JSUI.fromJSONstring() in favor of integrating json2.js by douglascrockford@github (2018) for more robust JSON parse/stringify support
		- adding experimental support for LZW (pieroxy/lz-string)
		- fixed addButton() obj,imageFile => obj.imgFile issue (JSUI.js should be entirely usable without PNG dependencies)
		- fixed addToggleIconGroup() to accept undefined/invalid .images strings (fallback to radiobuttons)
		- added saveConfigFile/deleteConfigFile/openConfigFileLocation and addDeleteConfigButton/addOpenConfigLocationButton methods (tested with JSON)
		- adding JSUI.anchorRef property + JSUI.getAnchorReference()
		- tweaked addNumberFloat() to avoid storing value as string 
		- added HTML redirect for macOS version of JSUI.launchURL()
		- added Array prototype methods to help with expressing Artboard sequences: .indexOf(), .getUnique(), .sortAscending(), .sortDescending(), .getRamges()

	0.979
		- adding built-in Number prototype methods for calculating powers of 2 and multiples of x (JSUI methods to be deprecated after refactoring)
		- adding notion of editor context / project name to help store settings into separate userData folders, with a new "%appdata%/geeklystrips/Default" base
		- addListBox() now supports disabling of saving selection obj.disableSaving
		- String prototypes to help getting file extensions and suffixes
		- adding Ps+Ai workspace management/creation utility functions