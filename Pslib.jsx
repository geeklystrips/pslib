/*
	Pslib: Photoshop JSX Library of frequently-used functions
	
	- Per-layer metadata management: access, create, remove... 
	
	TODO
	- Pslib.clearNamespace() doesn't work
	- Pslib.clearXmp() doesn't work

*/


// using and adding functions to Pslib object -- whether or not the library has been loaded
// this technique makes it easier to create and stabilize additional subfunctions separately before integrating them
try
{
	// this will throw an exception if Pslib cannot be found
	// a try/catch is necessary to achieve this, because a simple if(Pslib == undefined) will halt execution
	var attempt = Pslib != undefined;
}
catch(e)
{
	// if we have an error here, it's most likely because we didn't include the library in the preceding statements
	// the current script might be part of an include by a script loaded beforehand

	// $.level == 0 if the script is run by Photoshop, == 1 if run by ExtendScript ToolKit
	// if ESTK, then write to console for easier debugging
	if($.level) $.writeln("Pslib object not found. Creating placeholder.");
	
	// errors are objects that can give you some information about what went wrong 
	//$.writeln("typeof e.message: " + typeof e.message + "\n\ne:\n" + e + "\n\ne.message:\n" + e.message);
	$.writeln(e);
	
	// here's one way to dissect an object
	// use carefully, especially if you tend to Object.prototype stuff
//~ 	if($.level)
//~ 	{
//~ 		// for every property in the object,
//~ 		for (var i in e)
//~ 		{
//~ 			var val = e[i];
//~ 			$.writeln("\t" + val + " = " + e[val] + "  [" + (typeof e[val]).toUpperCase() + "]");
//~ 		}
//~ 	}
	
	// create Pslib as a persistent object 
	// it will remain accessible across most scopes, which is useful when working with panels & actions
	// 
	Pslib = function(){};
	
	// these functions are often required when working with code obtained using the ScriptingListener plugin
	cTID = function(s) {return app.charIDToTypeID(s);}
	sTID = function(s){return app.stringIDToTypeID(s);}
}

// #############  PER-LAYER METADATA FUNCTIONS

// define default namespace
Pslib.XMPNAMESPACE = "http://custom/";
Pslib.XMPNAMESPACEPREFIX = "cstm:";

// register custom namespace
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


"Pslib successfully loaded";
