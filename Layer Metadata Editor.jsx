// layer metadata editor

#target photoshop

// #############  PER-LAYER METADATA FUNCTIONS
Pslib = function(){};

// define default namespace
Pslib.XMPNAMESPACE = "http://custom/";
Pslib.XMPNAMESPACEPREFIX = "cstm:";
Pslib.DEFAULTPROPERTYNAME = "default";
Pslib.DEFAULTPROPERTYVALUE = "value";

// for replacing huge whitespace chunk in XMP
var XmpWhitespace = "                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                           ";
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

// load XMP
Pslib.loadXMPLibrary = function()
{
   if (!ExternalObject.AdobeXMPScript)
   {
      try
	{
         if($.level) $.writeln("Loading XMP Script Library");
         ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
	  return true;
      }
	catch (e)
	{
         if($.level) $.writeln("Error loading XMP Script Library\n" + e);
         return false;
      }
   }
	return true;
};

// unload XMP
Pslib.unloadXMPLibrary = function()
{
   if(ExternalObject.AdobeXMPScript) 
   {
      try
      {
	   if($.level) $.writeln("Unloading XMP Script Library");
         ExternalObject.AdobeXMPScript.unload();
         ExternalObject.AdobeXMPScript = undefined;
	   return true;
      }
      catch(e)
      {
         if($.level) $.writeln("Error unloading XMP Script Library\n" + e);
		return false;
      }
   }
};

// get layer's existing XMP if present
Pslib.getXmp = function (layer, createNew)
{
	var layer = (layer == undefined ? app.activeDocument.activeLayer : layer);
	var createNew = (createNew == undefined ? false : createNew);
	var xmp;
	
	// if library loads without problem, proceed to get the layer's xmpMetadata
	if(Pslib.loadXMPLibrary())
	{
		try
		{
			if($.level) $.writeln("Attempting to get metadata for layer \"" + layer.name + "\"");
			xmp = new XMPMeta( layer.xmpMetadata.rawData );
		}
		catch( e )
		{
			if($.level) $.writeln("Metadata could not be found for layer \"" + layer.name + "\"" + (createNew ? "\nCreating new XMP object." : "") );
			if(createNew) xmp = new XMPMeta();
		}
		return xmp;
	}
	else
	{
		return xmp;
	}
};

// get property: returns a string
Pslib.getXmpProperty = function (layer, property)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var value;
		var xmp;
		
		// make sure we're not working with a background layer
		if(layer.isBackgroundLayer)
		{
			if($.level) $.writeln("Metadata cannot exist on a background layer, so it cannot be accessed.");
			return null;
		}
		
		// access metadata
		try
		{
			xmp = new XMPMeta( layer.xmpMetadata.rawData );
			value = xmp.getProperty(Pslib.XMPNAMESPACE, property)
		
			// unload library
		//	Pslib.unloadXMPLibrary();
			return value;
		
		} catch( e ) {
			if($.level) $.writeln("XMP metadata could not be found for layer \"" + layer.name + "\"");
		//   xmp = new XMPMeta();
			return null
		}
	}
	else
	{
		return null;
	}
};

// delete specific property
Pslib.deleteXmpProperty = function (layer, property)
{
	// load library
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var xmp = Pslib.getXmp(layer);
		
		try
		{
			xmp.deleteProperty(Pslib.XMPNAMESPACE, property);
			layer.xmpMetadata.rawData = xmp.serialize();
			return true;
		}
		catch( e )
		{
			if($.level) $.writeln("Metadata property could not be deleted from layer \"" + layer.name + "\"");
			//xmp = new XMPMeta();
			return false;
		}
	}
	else
	{
		return false;
	}
};

// set multiple properties
// expects a two-dimensional array
Pslib.setXmpProperties = function (layer, propertiesArray)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var prop;
		var val;
		var xmp;
		
		// make sure we're not working with a background layer
		if(layer.isBackgroundLayer)
		{
			if($.level) $.writeln("XMP Metadata cannot be placed on a background layer. Aborting.");
			return false;
		}
		
		// access metadata
		try
		{
		   xmp = new XMPMeta( layer.xmpMetadata.rawData );
		   if($.level) $.writeln("XMP Metadata successfully fetched from layer \"" + layer.name + "\"");
		} catch( e ) 
		{
			if($.level) $.writeln("XMP metadata could not be found for layer \"" + layer.name + "\".\nCreating new XMP metadata container.");
			xmp = new XMPMeta(  );
		}
	   
		// loop through array properties and assign them
		if($.level) $.writeln("\nLooping through properties...");
		for (var i = 0; i < propertiesArray.length; i++)
		{	
			prop = propertiesArray[i][0];
			val = propertiesArray[i][1];
			
			// modify metadata
			try
			{
				var propertyExists = xmp.doesPropertyExist(Pslib.XMPNAMESPACE, prop);
				
				
				// add new property if not found
				if(!propertyExists)
				{
					xmp.setProperty(Pslib.XMPNAMESPACE, prop, val);
					if($.level) $.writeln("\tadding [" + prop + ": " + val +"]  " + typeof val);
				}
				// if property found and value different, update
				else if(propertyExists && xmp.getProperty(Pslib.XMPNAMESPACE, prop).toString() != val.toString() )
				{
					xmp.setProperty(Pslib.XMPNAMESPACE, prop, val);
					if($.level) $.writeln("\tupdating [" + prop + ": " + val +"]  " + typeof val);
				}
				else
				{
					if($.level) $.writeln("\tno change to existing property [" + prop + ": " + val +"]  " + typeof val);
				}
			} 
			catch( e )
			{
				var msg = "Could not place metadata property on provided layer.\n[" + prop + ": " + val +  +"]  " + typeof val + "\n" + e;
			   if($.level) $.writeln( msg );
			   else alert(msg);
			   return false;
			}
		}

		// applly and serialize
		layer.xmpMetadata.rawData = xmp.serialize();
		if($.level) $.writeln("Provided properties were successfully added to object \"" + layer.name + "\"");
		
		// unload library
	//	Pslib.unloadXMPLibrary();
		
		return true;
	}
	else
	{
		return false;
	}
};

// clear XMP : current workaround is to replace current data by empty data
// this is problematic if you actually want to strip the layer from its metadata object entirely 
Pslib.clearXmp = function (layer)
{
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		
		// if metadata not found, return
		try
		{
			var xmp = new XMPMeta(layer.xmpMetadata.rawData);
		}
		catch(e)
		{
			//if($.level) $.writeln(msg + "\n" + e);
			return true;
		}
		
		// if metadata found, replace by empty version
		var emptyXmp = new XMPMeta();
		layer.xmpMetadata.rawData = emptyXmp.serialize();
		
		//	Pslib.unloadXMPLibrary();
			
		return true;
	}
	else
	{
		return false;
	}
};

// clear entire namespace
Pslib.clearNamespace = function (layer, namespace)
{
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		
		// if metadata not found, return
		try
		{
			var xmp = new XMPMeta(layer.xmpMetadata.rawData);
			XMPUtils.removeProperties(xmp, namespace, undefined, XMPConst.REMOVE_ALL_PROPERTIES);
			layer.xmpMetadata.rawData = xmp.serialize();
			//alert(xmp.serialize());
		}
		catch(e)
		{
			if($.level) $.writeln("Metadata not found\n" + e);
			return false;
		}
		
		// if metadata found, replace by empty version
		//var emptyXmp = new XMPMeta();
		//layer.xmpMetadata.rawData = emptyXmp.serialize();
			
		return true;
	}
	else
	{
		return false;
	}
};

// save metadata to XML file
Pslib.exportLayerMetadata = function (layer, path, alertMsg)
{
	if(Pslib.loadXMPLibrary())
	{
		var xmp;
		
		// verify that xmp data is available
		   try
		   {
			  var xmp = layer.xmpMetadata.rawData.toString();

			// 
			if(alertMsg) alert(xmp);
			//
		   }
			catch(e)
			{
			   var msg = "";
			   if(e.message.match("missing") != null)
			   {	
				   msg += "There doesn't seem to be any metadata attached to layer \"" + layer.name + "\"";  
				}
				if($.level) $.writeln(msg + "\n" + e);
				else alert(msg + "\n" + e);
				return false;
		   }
	   
		var path = path == undefined ? File.saveDialog() : path;
		if(path != null)
		{
		   var file = new File(path);

		if(file.exists)
		{
			if($.level) $.writeln("\nFile already present. Prompting user for permission to replace.");
			// if file exists, present the user with the option to replace it
			if(confirm ("Do you wish to overwrite this file?\n\n" + file.fsName, true, "Replace file?"))
			{
				try
				{
					if($.level) $.writeln("Removing file:\n" + file.fsName );
					file.remove();	
				}
				catch(e)
				{
					if($.level) $.writeln("\nCould not remove file. Please verify that it is not open by a different process.");
					return false;
				}
			}
			else
			{
				if($.level) $.writeln("User opted not to replace the file.");
				return false;
			}
		}
		   
		   file.encoding = "UTF-8";
		   try
		   {
			file.open("w");
			file.write(xmp);
			file.close();
		   }
			catch(e)
			{
			   var msg = "";

				if($.level) $.writeln("Unable to write to file.\n" + msg + "\n" + e);
				else alert("Unable to write to file.\n" + msg + "\n" + e);
				return false;
		   }
		   file.close();
		}
	//	Pslib.unloadXMPLibrary();
		return true;
	}
	else
	{
		return false;
	}
};

// app functions

function Main()
{
	// prepare XMP container
	var XMPObj = null;
	var style = ScriptUI.newFont("Arial", "REGULAR", 18);

	// build dialog window
	var win = new Window('dialog', "Layer Metadata Editor");
	
	// background color
	//win.graphics.backgroundColor = win.graphics.newBrush (win.graphics.BrushType.SOLID_COLOR, [0.05, 0.5, 0.25]);

	win.alignChildren = 'fill';
	
	var maingroup = win.add('group');
	maingroup.orientation = "column";
	maingroup.alignChildren = 'fill';
	var propxmp = maingroup.add('group');
	propxmp.orientation = "column";
	propxmp.alignChildren = 'fill';
	
	var layerObjectPanel = propxmp.add('panel', undefined, "Layer Object");
	layerObjectPanel.alignChildren = 'right';
	
	var layerObjectGroup = layerObjectPanel.add('group');
	var layerNameField =  layerObjectGroup.add('statictext', undefined, "Name:");
	layerNameField.enabled = false;
	var layerNameField2 =  layerObjectGroup.add('statictext', undefined, layerInfo.name);
	layerNameField2.graphics.font = style;
	layerNameField2.graphics.foregroundColor = layerNameField2.graphics.newPen (win.graphics.PenType.SOLID_COLOR, [0.25, 0.25, 0.6], 1);

	var layerTypeField =  layerObjectGroup.add('statictext', undefined, "Type:");
	layerTypeField.enabled = false;
	layerObjectGroup.add('statictext', undefined, layerObject.typename);
		
	if(layerInfo.typename != "LayerSet")
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
	
	var layerXField =  layerObjectCoordsGroup.add('statictext', undefined, "X:");
	layerXField.enabled = false;
	layerObjectCoordsGroup.add('statictext', undefined, layerInfo.x);
	var layerYField =  layerObjectCoordsGroup.add('statictext', undefined, "Y:");
	layerYField.enabled = false;
	layerObjectCoordsGroup.add('statictext', undefined, layerInfo.y);
	
	var propertiesPanel = propxmp.add('panel', undefined, "Individual Properties");
	propertiesPanel.alignChildren = 'right';
	
	var propertyGroup = propertiesPanel.add('group');
	propertyGroup.add('statictext', undefined, "Property:");
	var property =  propertyGroup.add('edittext', undefined, Pslib.DEFAULTPROPERTYNAME); 
	property.characters = 20;
	propertyGroup.add('statictext', undefined, "Value:");	
	var propertyValue = propertyGroup.add('edittext', undefined, Pslib.DEFAULTPROPERTYVALUE ); 
	propertyValue.characters = 20;
	
	var namespacePanel = propxmp.add('panel', undefined, "Namespace");
	namespacePanel.alignChildren = 'right';

	var namespaceGroup = namespacePanel.add('group');
	//namespaceGroup.add('statictext', undefined, "Namespace:");
	var namespace =  namespaceGroup.add('edittext', undefined, Pslib.XMPNAMESPACE); 
	namespace.characters = 20;
	namespaceGroup.add('statictext', undefined, "Prefix:");	
	var namespacePrefix = namespaceGroup.add('edittext', undefined, Pslib.XMPNAMESPACEPREFIX); 
	namespacePrefix.characters = 20;
	
	var registerNamespace = namespaceGroup.add('button', undefined, "Register Namespace"); 

	var propertyDebug = propertiesPanel.add('statictext', undefined, "");
	propertyDebug.characters = 75;
	propertyDebug.enabled = false;
	
	var dataButtonsGroup = propertiesPanel.add('group');	
	var getValue = dataButtonsGroup.add('button', undefined, "Get"); 
	var setValue = dataButtonsGroup.add('button', undefined, "Set"); 
	var removeProperty = dataButtonsGroup.add('button', undefined, "Remove"); 
	
	var xmpDisplay = maingroup.add('group');
	xmpDisplay.alignChildren = 'fill';
	
	var xmpDisplayPanel = xmpDisplay.add('panel', undefined, "XMPMeta Object");
	xmpDisplayPanel.alignChildren = 'left';
	
	var xmpDisplayText = xmpDisplayPanel.add("edittext", undefined, XMPObj);
	xmpDisplayText.characters = 80;
	xmpDisplayText.multiline = true;
	xmpDisplayText.preferredSize.height = 350;
	xmpDisplayText.graphics.foregroundColor = xmpDisplayText.graphics.newPen (xmpDisplayText.graphics.PenType.SOLID_COLOR, [1, 1, 1], 1);
	xmpDisplayText.graphics.backgroundColor = xmpDisplayText.graphics.newBrush (xmpDisplayText.graphics.BrushType.SOLID_COLOR, [0.4, 0.4, 0.4]);
		
	var xmpDebug = xmpDisplayPanel.add('statictext', undefined, "");
	xmpDebug.characters = 75;
	xmpDebug.enabled = false;
	
	var xmpButtonsGroup = xmpDisplayPanel.add('group');
	var addXMPObject = xmpButtonsGroup.add('button', undefined, "Add Empty XMP to Layer"); 
	var getXMPObject = xmpButtonsGroup.add('button', undefined, "Get XMP from Layer"); 
//	var iterateXMPObject = xmpButtonsGroup.add('button', undefined, "Iterate"); 
	var saveToXML = xmpButtonsGroup.add('button', undefined, "Save XMP to XML"); 
	saveToXML.enabled = exportXML;
	saveToXML.helpTip = "You should save your document before using this feature.";
//	var removeNamespace = xmpButtonsGroup.add('button', undefined, "Remove Namespace"); 
//	var removeXMPObject = xmpButtonsGroup.add('button', undefined, "Remove XMP"); 
	
	//	
	// individual properties callbacks
	//
	
	// get value for specified property
	getValue.onClick = function()
	{
		var prop = property.text
		var val = propertyValue.text;
		
		if(prop != "")
		{

			if(!layerObject.isBackgroundLayer)
			{
				// check for existing XMP object
				XMPObj = Pslib.getXmp(layerObject);
				if(XMPObj != null)
				{
					var data = Pslib.getXmpProperty(layerObject, prop);
					propertyValue.text = data != undefined ? data : propertyValue.text;
					if(data == undefined) propertyDebug.text = "[GET PROPERTY: Property not found]";
					XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);
					xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
				}
				else
				{
					var msg = "[GET PROPERTY: No XMP object found on layer]";
					xmpDebug.text = msg;
					xmpDisplayText.text = msg;	
				}
			}
			else
			{
				var msg = "[GET PROPERTY: A background layer cannot contain an XMP object]";
				xmpDebug.text = msg;
				xmpDisplayText.text = msg;
			}
		}
		else
		{
			var msg =  "[GET PROPERTY: Please enter a property name]";
			propertyDebug.text = msg;
			xmpDisplayText.text = msg;
		}
		
	};

	// set value for specified property -- creates property if not found
	setValue.onClick = function()
	{
		if(property.text != "" && propertyValue.text != "" && propertyValue.text != "[INVALID]")
		{
			if(!layerObject.isBackgroundLayer)
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
					
					if(Pslib.setXmpProperties(layerObject, [[property.text, propertyValue.text]]))
					{
						propertyDebug.text = "[ADD PROPERTY: Property " + (propertyExists? "updated" : "added") + " successfully]";
						XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);	
						xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
					}
					else
					{
						var msg = "[ADD PROPERTY: Error adding property]";
						propertyDebug.text = msg;
						xmpDisplayText.text = msg;
					}
				}
				else
				{
					var msg = "[ADD PROPERTY: XMP Object not found.]";
					propertyDebug.text = msg;
					xmpDisplayText.text = msg;
				}
			}
			else
			{
				var msg = "[ADD PROPERTY: A background layer cannot contain metadata]";
				xmpDebug.text = msg;
				xmpDisplayText.text = msg;
			}
		}
		else
		{
			var msg = "[ADD PROPERTY: Provided value is either invalid or empty]";
			propertyDebug.text = msg;
			xmpDisplayText.text = msg;
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
				}
				else
				{
					var msg = "[REMOVE PROPERTY: Error removing property]";
					propertyDebug.text = msg;
					xmpDisplayText.text = msg;
				}
			}
			else
			{
				var msg = "[REMOVE PROPERTY: A background layer cannot contain an XMP object]";
				xmpDebug.text = msg;
				xmpDisplayText.text = msg;
			}
		}
		else
		{
			var msg = "[REMOVE PROPERTY: Please enter a property name]";
			xmpDebug.text = msg;
			xmpDisplayText.text = msg;
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
		}
		catch(e)
		{
			propertyDebug.text = "[ERROR REGISTERING NAMESPACE]";
		}
	}
	//
	// XMP object callbacks
	//
	
	// add XMP object to provided layer
	addXMPObject.onClick = function()
	{
		if(!layerObject.isBackgroundLayer)
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
					xmpDebug.text = "[ADD XMP: Current layer XMP object successfully replaced by empty XMP object]";
				}
				else
				{
					xmpDebug.text = "[ADD XMP: Current layer XMP object preserved]";
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
				xmpDebug.text = "[ADD XMP: XMP object successfully added to layer]";
			}
		}
		else
		{
			var msg = "[ADD XMP: Cannot add XMP object to a background layer]";
			xmpDebug.text = msg;
			xmpDisplayText.text = msg;
		}
	};

	// get XMP object
	getXMPObject.onClick = function()
	{
		if(!layerObject.isBackgroundLayer)
		{
			// get existing XMP Object
			if(Pslib.getXmp(layerObject))
			{
				xmpDebug.text = "[GET XMP: Existing XMP object successfully harvested from layer]";
				XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);	
				xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
			}
			else
			{
				var msg = "[GET XMP: No XMP object found on layer]";
				xmpDebug.text = msg;
				xmpDisplayText.text = msg;				
			}
		}
		else
		{
			var msg = "[GET XMP: A background layer cannot contain an XMP object]";
			xmpDebug.text =  msg;
			xmpDisplayText.text =  msg;
		}
	};
	
//~ 	// iterate through XMP properties
//~ 	iterateXMPObject.onClick = function()
//~ 	{
//~ 		if(!layerObject.isBackgroundLayer)
//~ 		{
//~ 			// get existing XMP Object
//~ 			if(Pslib.getXmp(layerObject))
//~ 			{
//~ 				xmpDebug.text = "[ITERATE XMP: Existing XMP object successfully harvested from layer]";
//~ 				XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);
//~ 				var iterator = XMPObj.iterator(undefined, Pslib.XMPNAMESPACE, "color"); // ************ ????

//~ 				alert(iterator.next());
/*				
next()
XMPIteratorObj.next ( )
Retrieves the next item in the metadata.
Returns an XMPProperty object, or null if there are no more items.
      skipSiblings()
XMPIteratorObj.skipSiblings ( )
Skips the subtree below and the siblings of the current node on the subsequent call to next(). Returns undefined.
      skipSubtree()
XMPIteratorObj.skipSubtree ( )
Skips the subtree below the current node on the subsequent call to next(). Returns undefined.
		*/		
//~ 				xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
//~ 			}
//~ 			else
//~ 			{
//~ 				var msg = "[ITERATE XMP: No XMP object found on layer]";
//~ 				xmpDebug.text = msg;
//~ 				xmpDisplayText.text = msg;				
//~ 			}
//~ 		}
//~ 		else
//~ 		{
//~ 			var msg = "[ITERATE XMP: A background layer cannot contain an XMP object]";
//~ 			xmpDebug.text =  msg;
//~ 			xmpDisplayText.text =  msg;
//~ 		}
//~ 	}

	// save XMP object to XML file
	saveToXML.onClick = function()
	{
		if(!layerObject.isBackgroundLayer)
		{
			
			if(Pslib.exportLayerMetadata(layerObject, doc.path + "/" + doc.name + "_" + layerObject.name + ".xml", false))
			{
				xmpDebug.text = "[SAVE XML: XMP object successfully exported to XML file]";
				XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);	
				xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
			}
			else
			{
				var msg = "[SAVE XML: No XMP object found on layer]";
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

	// remove XMP object from layer (replaces the existing XMP by an empty one)
//~ 	removeXMPObject.onClick = function()
//~ 	{
//~ 		if(!layerObject.isBackgroundLayer)
//~ 		{
//~ 			var testXmp;
//~ 			var clearXMP = Pslib.clearXmp(layerObject);
//~ 			
//~ 			if(clearXMP)
//~ 			{
//~ 				// need one more try/catch block here, because Pslib.clearXmp also returns true when there is no XMP object attached to the layer
//~ 				try
//~ 				{
//~ 					//testXmp = new XMPMeta( layerObject.xmpMetadata.rawData );
//~ 					XMPObj = new XMPMeta( layerObject.xmpMetadata.rawData);
//~ 					layerObject.xmpMetadata.rawData = XMPObj.serialize();
//~ 					xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
//~ 					xmpDebug.text = "[REMOVE XMP: layer XMP object successfully replaced by empty XMP object]";
//~ 				}
//~ 				catch(e)
//~ 				{
//~ 					var msg = "[REMOVE XMP: No XMP object found on layer]";
//~ 					xmpDisplayText.text = msg;
//~ 					xmpDebug.text = msg;
//~ 				}
//~ 			}
//~ 			else
//~ 			{
//~ 				var msg = "[REMOVE XMP: Error removing XMP object from layer]";
//~ 				xmpDebug.text = msg;
//~ 				xmpDisplayText.text = msg;
//~ 			}
//~ 		}
//~ 		else
//~ 		{
//~ 			var msg = "[REMOVE XMP: A background layer cannot contain metadata]";
//~ 			xmpDebug.text = msg;
//~ 			xmpDisplayText.text = msg;
//~ 		}
//~ 	};

	// remove specific namespace from XMP object
//~ 	removeNamespace.onClick = function()
//~ 	{
//~ 		if(!layerObject.isBackgroundLayer)
//~ 		{
//~ 			var testXmp;
//~ 			var clearXMP = Pslib.clearXmp(layerObject);
//~ 			
//~ 			if(clearXMP)
//~ 			{
//~ 				// need one more try/catch block here, because Pslib.clearXmp also returns true when there is no XMP object attached to the layer
//~ 				try
//~ 				{					
//~ 					Pslib.clearNamespace(layerObject, Pslib.XMPNAMESPACE);
//~ 					XMPObj = new XMPMeta(layerObject.xmpMetadata.rawData);
//~ 				//	layerObject.xmpMetadata.rawData
//~ 				//	layerObject.xmpMetadata.rawData = XMPObj.serialize();
//~ 					xmpDisplayText.text = XMPObj.serialize().replace(XmpWhitespace, "");
//~ 					
//~ 					//var xmp = new XMPMeta(layer.xmpMetadata.rawData);
//~ 					//XMPUtils.removeProperties(xmp, namespace, undefined, XMPConst.REMOVE_ALL_PROPERTIES);
//~ 					//layer.xmpMetadata.rawData = xmp.serialize();
//~ 				
//~ 					xmpDebug.text = "[REMOVE NAMESPACE: successful]";
//~ 				}
//~ 				catch(e)
//~ 				{
//~ 					var msg = "[REMOVE NAMESPACE: No XMP object found on layer]";
//~ 					xmpDisplayText.text = msg;
//~ 					xmpDebug.text = msg;
//~ 				}
//~ 			}
//~ 			else
//~ 			{
//~ 				var msg = "[REMOVE NAMESPACE: Error removing XMP object from layer]";
//~ 				xmpDebug.text = msg;
//~ 				xmpDisplayText.text = msg;
//~ 			}
//~ 		}
//~ 		else
//~ 		{
//~ 			var msg = "[REMOVE NAMESPACE: A background layer cannot contain metadata]";
//~ 			xmpDebug.text = msg;
//~ 			xmpDisplayText.text = msg;
//~ 		}
//~ 	};

	// load XMP object
	getXMPObject.onClick();

	// show dialog
	win.center();
	win.show();
};

//
// Main app execution
//

if(app.documents.length)
{
	var doc = app.activeDocument;
	var layerObject = doc.activeLayer;
	
	var layerInfo = {};
			
	if(layerObject != undefined)
	{
		layerInfo.name = layerObject.name;
		layerInfo.typename = layerObject.typename;
		layerInfo.kind = layerObject.typename == "LayerSet" ? "LayerSet" :  layerObject.kind;
		
		var b = layerObject.bounds;
		
		layerInfo.width = b[2].as('px') - b[0].as('px');
		layerInfo.height = b[3].as('px') - b[1].as('px');
		layerInfo.x = b[0].as('px');
		layerInfo.y = b[1].as('px');		
	}
	var exportXML;
	
	// this is to determine where to save the XML file
	try
	{
		var docpath = doc.path;
		exportXML = true;
	}
	catch(e)
	{
		exportXML = false;
	}
	
	Main();
}
else
{
	alert("No available document!");
}
