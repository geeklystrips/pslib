/*
	LayerMetadataEditor.jsx  (XMP operations)
	Source: https://github.com/geeklystrips/pslib
	
	Latest fixes:
	- re-added iconbutton
	- fixed multiline texfield issue with CC+ (multiline property seems to be required at creation)
	- JSUI update for iconbutton support (UI script, 5 states)
	- general layout 
	- added function to Load properties/values from CSV file
	- tooltips

	TODO
	- add "/img/DocMetadata.png" & "/img/LayerMetadata.png"

	- option to avoid isBackgroundLayer status check (faster, will cause error if user tries to add tag to background layer)
	
*/

#include "Pslib.jsx"
#include "jsui.js"

#target photoshop

var useDoc = useDoc != undefined ? useDoc : false;
var XMPObj = null;

JSUI.TOOLNAME = "XMP Metadata Editor";
JSUI.populateINI();

try
{
	// load library
	 if(!ExternalObject.AdobeXMPScript)
	{
		ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
	}

	// register custom namespace
	XMPMeta.registerNamespace(Pslib.XMPNAMESPACE, Pslib.XMPNAMESPACEPREFIX);
}
catch(e)
{
	// if ExternalObject.AdobeXMPScript not present, hardcode the namespace to exif
	Pslib.XMPNAMESPACE = "http://ns.adobe.com/exif/1.0/";
}

// app functions

function Main()
{
	// prepare XMP container

	var propertiesArr = [];
	var style = ScriptUI.newFont("Arial", "REGULAR", 18);

	// build dialog window
//	var win = new Window('dialog', (useDoc ? "Document" : "Layer") + " Metadata Editor " + "[" + (useDoc ? new File (Pslib.getDocumentPath(doc)).fsName : layerObject.name) + "]  v" + Pslib.version + "  " + (Pslib.isPs64bits ? "x64" : "x32"), undefined, {closeButton: true});
//	win.alignChildren = 'fill';

	var win = JSUI.createDialog( { title: /*JSUI.TOOLNAME*/(useDoc ? "Document" : "Layer") + " Metadata Editor " + "[" + (useDoc ? new File (Pslib.getDocumentPath(doc)).fsName : layerObject.name) + "]  v" + Pslib.version + "  " + (Pslib.isPs64bits ? "x64" : "x32"), orientation: "column", alignChildren: "left" } );

	
	// var maingroup = win.add('group');
	// maingroup.orientation = "row";
	// maingroup.alignChildren = 'fill';
	var maingroup = win.addRow();
	
	// var propxmp = maingroup.add('group');
	// propxmp.orientation = "column";
	// propxmp.alignChildren = 'fill';
	var propxmp = maingroup.addColumn();
	
	// var layerObjectPanel = propxmp.add('panel', undefined, "Target Object");
	// layerObjectPanel.alignChildren = 'left';
	var layerObjectPanel = propxmp.addPanel( { label: "Target Object" } );
	
	// var layerObjectGroup = layerObjectPanel.add('group');
	// var layerNameField =  layerObjectGroup.add('statictext', undefined, "Name:");
	// layerNameField.enabled = false;
	// var layerNameField2 =  layerObjectGroup.add('statictext', undefined, layerInfo.name);
	var layerObjectGroup = layerObjectPanel.addRow();
	layerObjectGroup.addStaticText( { text: "Name:", disabled: true } );
	var layerNameField2 = layerObjectGroup.addStaticText( { text: layerInfo.name } );

	layerNameField2.graphics.font = style;

	var layerTypeField =  layerObjectGroup.add('statictext', undefined, "Type:");
	layerTypeField.enabled = false;
	layerObjectGroup.add('statictext', undefined, layerObject.typename);
			
		if(layerInfo.typename != "LayerSet" && !useDoc)
		{
			var layerKindField =  layerObjectGroup.add('statictext', undefined, "Kind:");
			layerKindField.enabled = false;
			layerObjectGroup.add('statictext', undefined, layerInfo.kind);
		}

	var layerObjectCoordsGroup = layerObjectPanel.add('group');
	var layerWidthField =  layerObjectCoordsGroup.add('statictext', undefined, "Width:");
	layerWidthField.enabled = false;
	layerObjectCoordsGroup.add('statictext', undefined, layerInfo.width);
	var layerHeightField =  layerObjectCoordsGroup.add('statictext', undefined, "Height:");
	layerHeightField.enabled = false;
	layerObjectCoordsGroup.add('statictext', undefined, layerInfo.height);
	
	// try
	// {
	// 	var imgPath = new File( File($.fileName).parent + (useDoc ? "/img/DocMetadata.png" : "/img/LayerMetadata.png"));
	// 	var img = layerObjectGroup.add('iconbutton', undefined, ScriptUI.newImage(imgPath, imgPath, imgPath, imgPath));
	// 	img.alignment = "right";
	// }
	// catch(e)
	// {
		
	// }

	layerObjectGroup.addImage( { imgFile: "img/"+(useDoc ? "DocMetadata" : "LayerMetadata")+".png" });


	if(!useDoc)
	{
		var layerXField =  layerObjectCoordsGroup.add('statictext', undefined, "X:");
		layerXField.enabled = false;
		layerObjectCoordsGroup.add('statictext', undefined, layerInfo.x);
		var layerYField =  layerObjectCoordsGroup.add('statictext', undefined, "Y:");
		layerYField.enabled = false;
		layerObjectCoordsGroup.add('statictext', undefined, layerInfo.y);
	}

	var namespacePanel = propxmp.add('panel', undefined, "Namespace");
	namespacePanel.alignChildren = 'right';

	var namespaceGroup = namespacePanel.add('group');
	//namespaceGroup.add('statictext', undefined, "Namespace:");
	var namespace =  namespaceGroup.add('edittext', undefined, Pslib.XMPNAMESPACE); 
	namespace.characters = 25;
	namespaceGroup.add('statictext', undefined, "Prefix:");	
	var namespacePrefix = namespaceGroup.add('edittext', undefined, Pslib.XMPNAMESPACEPREFIX); 
	namespacePrefix.characters = 4;
	
	var registerNamespace = namespaceGroup.add('button', undefined, "Register");
	registerNamespace.helpTip = "Registers custom namespace";
	var removeNamespace = namespaceGroup.add('button', undefined, "Clear"); 
	removeNamespace.helpTip = "Removes specific namespace (including all its properties)";
	var propertiesPanel = propxmp.add('panel', undefined, "Properties");
	propertiesPanel.alignChildren = 'fill';
	
	var propertyGroup = propertiesPanel.add('group');
	propertyGroup.alignChildren = 'fill';
	propertyGroup.orientation = 'column';
	//propertyGroup.alignChildren = 'fill';
	var propertySubGroup1 = propertyGroup.add('group');
		propertySubGroup1.add('statictext', undefined, "Property:");
		var property =  propertySubGroup1.add('edittext', undefined, Pslib.DEFAULTPROPERTYNAME); 
		property.characters = 32;
	var propertySubGroup2 = propertyGroup.add('group');
		propertySubGroup2.add('statictext', undefined, "    Value:");	
		var propertyValue = propertySubGroup2.add('edittext', undefined, Pslib.DEFAULTPROPERTYVALUE ); 
		propertyValue.characters = 45;
	
	var propertyDebug = propertiesPanel.add('statictext', undefined, "");
	propertyDebug.characters = 50;
	propertyDebug.enabled = false;
	
	var dataButtonsGroup = propertiesPanel.add('group');	
	var setValue = dataButtonsGroup.add('button', undefined, "Set"); 
	setValue.helpTip = "Adds/updates property and value";
	var removeProperty = dataButtonsGroup.add('button', undefined, "Remove"); 
	removeProperty.helpTip = "Removes property";
	
	dataButtonsGroup.add('statictext', undefined, "      ");
	
	var saveToCSV = dataButtonsGroup.add('button', undefined, "Export all to CSV"); 
	saveToCSV.helpTip = "Saves currently active namespace properties/values to a CSV file (two columns)\nYou should save your document before using this feature.";
	saveToCSV.enabled = docSaved;
	
	var loadFromCSV = dataButtonsGroup.add('button', undefined, "Load from CSV"); 
	loadFromCSV.helpTip = "Loads properties/values to currently active namespace from CSV file (two columns)\nYou should save your document before using this feature.";
	//loadFromCSV.enabled = docSaved;
	
	var propertyList = propertiesPanel.add('listbox', undefined, Pslib.getPropertiesArray(layerObject));
	propertyList.preferredSize.width = 440;
	propertyList.preferredSize.height = 200;
	
	var xmpDisplay = maingroup.add('group');
	xmpDisplay.alignChildren = 'fill';
	
	var xmpDisplayPanel = xmpDisplay.add('panel', undefined, "XMPMeta Object");
	xmpDisplayPanel.alignChildren = 'left';
	
	var xmpDisplayText = xmpDisplayPanel.add("edittext", undefined, XMPObj, {multiline:true});
	xmpDisplayText.characters = 65;
	xmpDisplayText.preferredSize.height = 500;
	xmpDisplayText.graphics.foregroundColor = xmpDisplayText.graphics.newPen (xmpDisplayText.graphics.PenType.SOLID_COLOR, useDoc ? Pslib.dark : Pslib.light, 1);
	xmpDisplayText.graphics.backgroundColor = xmpDisplayText.graphics.newBrush (xmpDisplayText.graphics.BrushType.SOLID_COLOR, useDoc ? Pslib.light : Pslib.dark);
		
	var xmpDebug = xmpDisplayPanel.add('statictext', undefined, "");
	xmpDebug.characters = 75;
	xmpDebug.enabled = false;
	
	var xmpButtonsGroup = xmpDisplayPanel.add('group');
		
	if(!useDoc)
	{
		var addXMPObject = xmpButtonsGroup.add('button', undefined, "Add Empty XMP to Layer"); 
		addXMPObject.helpTip = "Adds empty XMP object to current layer";
	}
	var getXMPObject = {};
		
	var saveToXML = xmpButtonsGroup.add('button', undefined, "Save XMP to XML"); 
	saveToXML.enabled = docSaved;
	saveToXML.helpTip = "Saves XMP object XML file. You should save your document before using this feature.";

	// set value for specified property -- creates property if not found
	setValue.onClick = function()
	{
		if(property.text != "" && propertyValue.text != "" && propertyValue.text != "[INVALID]" && propertyValue.text.match(",") == null)
		{
			XMPObj = Pslib.getXmp (layerObject);
			if(XMPObj != null)
			{
				var propertyExists;
				var testXmp;
				
				try
				{
					testXmp = new XMPMeta( layerObject.xmpMetadata.rawData );
					propertyExists = testXmp.doesPropertyExist(Pslib.XMPNAMESPACE, property.text);
				}
				catch(e)
				{
					exists = false;
				}
				
				if(Pslib.setXmpProperties(layerObject, [[property.text, encodeURI(propertyValue.text)]]))
				{
					propertyDebug.text = "[ADD PROPERTY: Property " + (propertyExists? "updated" : "added") + " successfully]";
					XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);	
					xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
					propertyList.update();
				}
				else
				{
					var msg = "[ADD PROPERTY: Error adding property]";
					propertyDebug.text = msg;
				}
			}
			else
			{
				var msg = "[ADD PROPERTY: A background layer cannot contain metadata]";
				xmpDebug.text = msg;
			}
		}
		else
		{
			var msg = "[ADD PROPERTY: Provided value is either invalid or empty]";
			propertyDebug.text = msg;
		}
	};
	
	// remove specified property
	removeProperty.onClick = function()
	{
		if(property.text != "")
		{
			if(!layerObject.isBackgroundLayer)
			{
				if(Pslib.deleteXmpProperty(layerObject, property.text))
				{
					propertyDebug.text = "[REMOVE PROPERTY: Property removed successfully]";
					XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);	
					xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
					propertyList.update();
					
					property.text = "";
					propertyValue.text = "";
				}
				else
				{
					var msg = "[REMOVE PROPERTY: Error removing property]";
					propertyDebug.text = msg;
				}
			}
			else
			{
				var msg = "[REMOVE PROPERTY: A background layer cannot contain an XMP object]";
				xmpDebug.text = msg;
			}
		}
		else
		{
			var msg = "[REMOVE PROPERTY: Please enter a property name]";
			xmpDebug.text = msg;
		}
	};

	namespace.onChanging = function()
	{
		Pslib.XMPNAMESPACE = namespace.text;
		propertyDebug.text = "[NAMESPACE: " + Pslib.XMPNAMESPACE + "  PREFIX: " + Pslib.XMPNAMESPACEPREFIX + "]";
	};

	namespacePrefix.onChanging = function()
	{
		Pslib.XMPNAMESPACEPREFIX = namespacePrefix.text;
		propertyDebug.text = "[NAMESPACE: " + Pslib.XMPNAMESPACE + "  PREFIX: " + Pslib.XMPNAMESPACEPREFIX + "]";
	};

	registerNamespace.onClick = function()
	{
		try
		{
			XMPMeta.registerNamespace(Pslib.XMPNAMESPACE, Pslib.XMPNAMESPACEPREFIX);
			propertyDebug.text = "[REGISTERING NAMESPACE: " + Pslib.XMPNAMESPACE + "  PREFIX: " + Pslib.XMPNAMESPACEPREFIX + " SUCCESS]";
			XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);	
			xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
			propertyList.update();
		}
		catch(e)
		{
			propertyDebug.text = "[ERROR REGISTERING NAMESPACE]";
		}
	};

	removeNamespace.onClick = function()
	{
		try
		{
			Pslib.clearNamespace(layerObject, Pslib.XMPNAMESPACE);
			propertyDebug.text = "[CLEARING NAMESPACE: " + Pslib.XMPNAMESPACE + ": SUCCESS]";
			XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);	
			xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
			propertyList.update();
		//	propertyList.onChange();
		}
		catch(e)
		{
		//	alert("error clearing");
			propertyDebug.text = "[ERROR CLEARING NAMESPACE]";
		}
	}

	// listbox callbacks
	propertyList.onChange = function()
	{
		var props = Pslib.getPropertiesArray(layerObject);
		if(propertyList.selection != null)
		{
			property.text = propertyList.selection.toString().split(",")[0];
			propertyValue.text = decodeURI(propertyList.selection.toString().split(",")[1]);
		}
	};
	
	propertyList.update = function()
	{
		// store current length, selection
		var currentLength = propertyList.items.length;
		
		// store selected item text
		var currentSelection = propertyList.selection != null ? propertyList.selection.text : null;

		// get properties from object
		var props = Pslib.getPropertiesArray(layerObject);
		
		// remove items from list
		propertyList.removeAll();
		
		if(props != null)
		{
			for(var j = 0; propertyList.items.length < props.length; j++)
			{  
				var item = propertyList.add ("item", decodeURI(props[j].toString()));
							
					if(currentSelection != null)
					{
						if(item.text == currentSelection)
						{
							propertyList.selection = item;
						}
						else if(propertyList.items.length > currentLength)
						{
							propertyList.selection = propertyList.items[props.length-1];
						}
					}
				}
		}
	};

	propertyList._buildArray = function()
	{
		// build new array based on active selection
		var array = [];
		var debugArray = [];
		
		if(propertyList.selection != null)
		{
			for(var sel = 0; sel < propertyList.selection.length; sel++)
			{
				for(var i = 0; i < obj.list.length; i++)
				{
					if(i == propertyList.selection[sel])
					{ 
						array.push(i);
						if($.level) debugArray.push(propertyList.selection[sel]);
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

	//
	// XMP object callbacks
	//
	
	if(!useDoc)
	{

		// add XMP object to provided layer
		addXMPObject.onClick = function()
		{

			var hasXMP = Pslib.getXmp(layerObject);
			
			// if layer already has XMP, confirm with user before replacing it
			if(hasXMP != null)
			{
				// confirm replacement of current XMP object
				if(confirm ("Do you wish to replace the existing XMP object by a new one?"))
				{
					XMPObj = new XMPMeta( );
					layerObject.xmpMetadata.rawData = XMPObj.serialize();
					xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
					xmpDebug.text = "[ADD XMP: Current " + (useDoc ? "document" : "layer") +" XMP object successfully replaced by empty XMP object]";
					
					propertyList.update();
					property.text = "";
					propertyValue.text = "";
				}
				else
				{
					xmpDebug.text = "[ADD XMP: Current " + (useDoc ? "document" : "layer") +" XMP object preserved]";
					XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);
					xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
				}
				
			}
			// if layer does NOT have XMP
			else
			{
				XMPObj = new XMPMeta();
				layerObject.xmpMetadata.rawData = XMPObj.serialize();
				xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
				xmpDebug.text = "[ADD XMP: XMP object successfully added to " + (useDoc ? "document" : "layer") +"]";
			}
		};
	}

	// get XMP object
	getXMPObject.onClick = function()
	{
		// get existing XMP Object
		if(Pslib.getXmp(layerObject))
		{
			xmpDebug.text = "[GET XMP: Existing XMP object successfully harvested from " + (useDoc ? "document" : "layer") +"]";
			XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);
			
			propertiesArr = Pslib.getPropertiesArray(layerObject);

			xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
			
//~ 			updateDialogUI();
		}
		else
		{
			var msg = "[GET XMP: No XMP object found on " + (useDoc ? "document" : "layer") +"]";
			xmpDebug.text = msg;
			xmpDisplayText.text = msg;				
		}
	};

	// save XMP object to XML file
	saveToXML.onClick = function()
	{
		if(!layerObject.isBackgroundLayer)
		{
			if(Pslib.exportLayerMetadata(layerObject, doc.path + "/" + doc.name + (useDoc ? "" : "_" + layerObject.name) + ".xml", false))
		//	if(Pslib.exportLayerMetadata(layerObject, doc.path + "/" + doc.name + "_" + layerObject.name + ".xml", false))
			{
				xmpDebug.text = "[SAVE XML: XMP object successfully exported to XML file]";
				XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);	
				xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
			}
			else
			{
				var msg = "[SAVE XML: No XMP object found on " + (useDoc ? "document" : "layer") +"]";
				xmpDebug.text = msg;
				xmpDisplayText.text = msg;
			}
		}
		else
		{
			var msg = "[SAVE XML: A background layer cannot contain an XMP object]";
			xmpDebug.text = msg;
			xmpDisplayText.text = msg;
		}
	};

	// save active namespace to bidimensional property/value CSV file
	saveToCSV.onClick = function()
	{
		var testFolder;
		
		try
		{
			testFolder = new Folder(doc.path);
			if($.level) $.writeln("Browsing for file. Default path: " + testFolder.fsName);
		}
		catch(e)
		{
			alert("This document should be saved to disk before proceeding.");
			return;
		}
		
		if(!layerObject.isBackgroundLayer)
		{ 
			if(Pslib.propertiesToCSV(layerObject, Pslib.XMPNAMESPACE , doc.path + "/" + doc.name + (useDoc ? "" : "_" + layerObject.name) + ".csv"))
			{
				xmpDebug.text = "[SAVE CSV: Properties/values successfully exported to CSV file]";
			}
			else
			{
				var msg = "[SAVE CSV: No XMP object found on " + (useDoc ? "document" : "layer") +"]";
				xmpDebug.text = msg;
				xmpDisplayText.text = msg;
			}
		}
		else
		{
			var msg = "[SAVE CSV: A background layer cannot contain an XMP object]";
			xmpDebug.text = msg;
			xmpDisplayText.text = msg;
		}
		return;
	};

	// load properties from CSV
	loadFromCSV.onClick = function()
	{
		if(!layerObject.isBackgroundLayer)
		{ 
			// prompt user for CSV file location
			var csvFileURI;
			var testFolder;
			
			try
			{
				testFolder = new Folder(doc.path);
				if($.level) $.writeln("Browsing for file. Default path: " + testFolder.fsName);
			}
			catch(e)
			{
				testFolder = new Folder("~");
				alert("This document should be saved to disk before proceeding.");
				return;
			}

			if(File.myDefaultSave)
			{
			   Folder.current = File.myDefaultSave;
			}

			var chosenFile = File.openDialog("Prompt", "*.csv"); 

			if(chosenFile != null)
			{
				File.myDefaultSave = chosenFile.parent;
				
				xmpDebug.text = "chosenFile: " + chosenFile.fsName + "\n[ exists: " + chosenFile.exists + " ]";
				csvFileURI = chosenFile;
			}
					
			if(csvFileURI != null)
			{
				if(Pslib.propertiesFromCSV(layerObject, Pslib.XMPNAMESPACE, csvFileURI))
				{
					xmpDebug.text = "[LOAD CSV: Properties/values successfully imported from CSV file]";

					XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);	
					xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
					
					propertyList.update();
					property.text = "";
					propertyValue.text = "";
					
//~ 					updateDialogUI();
				}
				else
				{
					var msg = "[LOAD CSV: No XMP object found on " + (useDoc ? "document" : "layer") +"]";
					xmpDebug.text = msg;
					xmpDisplayText.text = msg;
				}
			}
		
		}
		else
		{
			var msg = "[LOAD CSV: A background layer cannot contain an XMP object]";
			xmpDebug.text = msg;
			xmpDisplayText.text = msg;
		}
	};

//~ 	updateDialogUI = function()
//~ 	{
//~ 		hasXMP = XMPObj != null;
//~ 		
//~ 		loadFromCSV.enabled = hasXMP;
//~ 		saveToCSV.enabled = docSaved && hasXMP;
//~ 		saveToXML.enabled = docSaved && hasXMP;
//~ 	};

	// load XMP object
	getXMPObject.onClick();
	
	// encodeURI issue
	propertyList.update();

	// show dialog
	win.center();
	win.show();
};

//
// Main app execution
//

if(Pslib.isPsCS4andAbove && app.documents.length)
{
	var doc = app.activeDocument;
	var layerObject = (useDoc ? doc : doc.activeLayer);  
	var layerInfo = {};

	if(layerObject != undefined)// && useDoc == false)
	{
		layerInfo.name = layerObject.name;
		layerInfo.typename = layerObject.typename;
		
		if(!useDoc)
		{
			layerInfo.kind = (layerObject.typename == "LayerSet" ? "LayerSet" :  layerObject.kind);
		
			var b = layerObject.bounds;
			layerInfo.width = b[2].as('px') - b[0].as('px');
			layerInfo.height = b[3].as('px') - b[1].as('px');
			layerInfo.x = b[0].as('px');
			layerInfo.y = b[1].as('px');
		}
		else
		{
			layerInfo.width = doc.width.as('px');
			layerInfo.height = doc.height.as('px');
		}
	}

	var docSaved;
	var hasXMP = XMPObj != null;
	
	// this is to determine if the current document has been saved to disk (XML & CSV output functions require an existing path)
	try
	{
		var docpath = doc.path;
		docSaved = true;
	}
	catch(e)
	{
		docSaved = false;
	}
	
	Main();
	
	// workaround for a variable persistence issue (feature?) with Photoshop CC+ and HTML5 panels context
	useDoc = false;
}
else
{
	if(!Pslib.isPsCS4andAbove && !useDoc) alert("Layer metadata features are only available with Photoshop CS4 and above.");
	else alert("No available document!");
}

"\n";
