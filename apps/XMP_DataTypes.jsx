/*
    Sandbox test for storing different data types to XMP (document or layer-based)


*/

#include "../Pslib.jsx";
#include "../jsui.js";

// extending Pslib

// upgrade Pslib.setXmpProperties() with optional argument to cover complex data types (arrays as Bag/Seq/Alt, objects as Struct) 
// dataType == ""
// dataType == "bag"
// dataType == "seq"
// dataType == "alt"
// dataType == "struct"

Pslib.setXmpProperties = function (target, propertiesArray, dataType)
{
    // if dataType is not defined, set to empty string
    var dataType = dataType == undefined ? "" : dataType;

    // make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var prop;
		var val;
		var xmp;
		
		// access metadata
		try
		{
		//    xmp = new XMPMeta( target.xmpMetadata.rawData );
		   xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );
		   if($.level) $.writeln("XMP Metadata successfully fetched from target \"" + target.name + "\"");
		} catch( e ) 
		{
			if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\".\nCreating new XMP metadata container.");
			xmp = new XMPMeta(  );
		}
	   
		// loop through array properties and assign them
		if($.level) $.writeln("\nLooping through properties...");
		for (var i = 0; i < propertiesArray.length; i++)
		{	
			prop = propertiesArray[i][0];
			val = encodeURI(propertiesArray[i][1]);
			
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
				else if(propertyExists && decodeURI(xmp.getProperty(Pslib.XMPNAMESPACE, prop).toString()) != val.toString() )
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
				var msg = "Could not place metadata property on provided target.\n[" + prop + ": " + val +  +"]  " + typeof val + "\n" + e;
			   if($.level) $.writeln( msg );
			//    else alert(msg);
			   return false;
			}
		}

		// apply and serialize
		if(Pslib.isPhotoshop) target.xmpMetadata.rawData = xmp.serialize();
		else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
		// if($.level) $.writeln("Provided properties were successfully added to object \"" + target.name + "\"");


		return true;
	}
	else
	{
		return false;
	}
};

#target photoshop;


Main();

function Main()
{
	function _setArray( xmpObj, arrName, arr )
	{
		//var arr = ["One", "Two", "Three"];

		for (var i = 0; i < arr.length; i++)
		{
			xmpObj.appendArrayItem(namespace,      			// Namespace
									arrName,     				// Array to fill
									arr[i],  					// value
									0,                			//value type (default)
									// XMPConst.ARRAY_IS_ORDERED   // <rdf:Seq>
									XMPConst.ARRAY_IS_UNORDERED   // <rdf:Bag>
									// XMPConst.ARRAY_IS_ALTERNATIVE   // <rdf:Alt>
		);   
				// alert(arrName + ": " + arr[i]);
		}
	};

	function _getArray( xmpObj, arrName )
	{
		if(!xmpObj) return false;

		var arr = [];

		//var propertyExists = xmpObj.doesPropertyExist(Pslib.XMPNAMESPACE, arrName);

		if(xmpObj.doesPropertyExist(Pslib.XMPNAMESPACE, arrName))
		{
			//XMPConst.PROP_IS_ARRAY
			// var items = getArrayItems(Pslib.XMPNAMESPACE, arrName)

			// return items;

			// var cnt = xmpObj.countArrayItems(namespace, property);
			// var objArr = [];
			// var arrItem;

			// if (cnt > 0){
			// 	for(var i = 1; i <= cnt; i++)
			// 	{
			// 		arrItem = xmpObj.getArrayItem(namespace, property, i);
			// 		if (arrItem && arrItem.options & XMPConst.PROP_IS_STRUCT)
			// 		{
			// 			var obj = getStructObj(namespace, property + "[" + i + "]")
			// 			objArr.push(obj);
			// 		}
			// 		else
			// 		{
			// 			objArr.push(arrItem.toString());
			// 		}
			// 	}
			// 	return objArr;
			// }

			// get array items
			var iterator = xmpObj.iterator( XMPConst.ITERATOR_JUST_LEAFNODES, 
				Pslib.XMPNAMESPACE,
				arrName
				);

			while(true)
			{
				var item = iterator.next();
				if (item)
				{ 
					if($.level) $.writeln(item.value);
					arr.push(item.value);
					// alert("_getArray()  " + arrName + ": " + item.value);
				} 
				else
				{ 
					break; 
				}
			}
		}
		else
		{
			return false;
		}

		return arr;
	};

	function _setStruct( xmpObj, objName, obj )
	{
		var props = obj.reflect.properties;
		for(var i in props)
		{
			var property = props[i];
			var value = obj[property];
	
			// weed out private properties
			if(property  == "__proto__" || property == "__count__" || property == "__class__" || property == "reflect" || property == "Components" || property == "typename")
			{
				continue;
			}

			xmpObj.setStructField(namespace,    	// Namespace
								objName,    		// Structure name
								namespace,    		// Field type namespace
								property,           // Key
								value, 				// Value
								0                   // default type value
			);
			//alert(objName + "." + prop + ": " + obj[prop]);
		}
	}

	// populate object properties from (known) struct
	function _getStruct( xmpObj, objName, obj )
	{
		if(xmpObj.doesPropertyExist(namespace, objName))
		{
			var props = obj.reflect.properties;
			for(var i in props)
			{
				var property = props[i];
				var value = obj[property];
		
				// weed out private properties
				if(property  == "__proto__" || property == "__count__" || property == "__class__" || property == "reflect" || property == "Components" || property == "typename")
				{
					continue;
				}
	
				obj[property] = xmpObj.getStructField(namespace,    // Namespace
									objName,    					// Structure name
									namespace,    					// Field type namespace
									property           				// Key
				);
				//alert(objName + "." + prop + ": " + obj[prop]);
			}
			return obj;
		}
		else return {};
	}

    // load AdobeXMPScript if not available
    if(ExternalObject.AdobeXMPScript == undefined)
    {
        ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    }

	// setting namespace
	Pslib.XMPNAMESPACE = "http://www.geeklystrips.com/";
	Pslib.XMPNAMESPACEPREFIX = "gs:";

	var namespace = Pslib.XMPNAMESPACE;
	var prefix = Pslib.XMPNAMESPACEPREFIX;

	XMPMeta.registerNamespace(Pslib.XMPNAMESPACE, Pslib.XMPNAMESPACEPREFIX);

   // var pic = File ( File($.fileName).path + '/resources/cocomeraia.tif' );

    var scriptPath = $.fileName;
	var scriptLocation = new File(scriptPath).parent;
	// source: https://www.iptc.org/std/photometadata/examples/IPTC-PhotometadataRef-Std2017.1.jpg
    var pic = new File( scriptLocation + "/img/IPTC-PhotometadataRef-Std2017.1.jpg");

    // new XMPFile object
    var xmpFile = new XMPFile(pic.fsName,
                                // XMPConst.FILE_TIFF,
                                XMPConst.FILE_JPEG,
                                XMPConst.OPEN_FOR_READ);

    // create XMPMeta object to work with
    var xmpMeta = xmpFile.getXMP();

	// experiment with arrays and structs
	_setArray( xmpMeta, "CustomArray", ["One", "Two", "Three"] );
	//alert( Pslib.getXmpProperty( ) )
	// xmpMeta.deleteArrayItem(namespace, "CustomArray", 1); // delete first item
	// xmpMeta.deleteArrayItem(namespace, "CustomArray", XMPConst.ARRAY_LAST_ITEM); // delete last item
	//xmpMeta.insertArrayItem( namespace, "CustomArray", XMPConst.ARRAY_LAST_ITEM, "Machin");

	_setStruct( xmpMeta, "CustomObject", { UniqueID: Math.random() * 100, LayerID: 3, Language: "French" });


	var cstmArr = _getArray(xmpMeta, "CustomObject");

	// var cstmObj = _getStruct(xmpMeta, { UniqueID: "", LayerID: "", Language: "" });
	// alert(cstmObj.Language)

	// if(cstmArr) alert(cstmArr[1]);

	// _getArray(xmpMeta, "CustomObject");
	// var alias = xmpMeta.resolveAlias(namespace, "CustomArray");
	// var aliasProp = xmpMeta.getProperty(namespace, "CustomArray");
	// if(aliasProp)
	// {
	// 	//alert(aliasProp.resolveAlias(namespace, "CustomArray"));
	// }
	//var alias = XMPMeta.resolveAlias(namespace, "CustomArray");
	//alert(alias.name + ": " + alias.arrayForm);

	// // source: https://www.xoogu.com/2019/cep-extendscript-and-xmp-api-notes-so-far/
	// for ( var i = 1, oArrayItem; oArrayItem = xmp.getProperty(XMPConst.NS_DC, 'title['+i+']'); i++)
	// {
	// 	oProperty.value[xmp.getQualifier(XMPConst.NS_DC, 'title['+i+']', XMPConst.NS_XML, 'lang')] = oArrayItem.value;
	// }

	// for ( var i = 1, oProperty; xmpMeta.getProperty(namespace, 'title['+i+']'); i++)
	// {
	// 	oProperty.value[xmp.getQualifier(namespace, 'title['+i+']', XMPConst.NS_XML, 'lang')] = oArrayItem.value;
	// }

    var metaString = xmpMeta.serialize();

	// var metadataDate = {};

	// if(xmpMeta.doesPropertyExist(XMPConst.NS_XMP, "MetadataDate"))
	// {
	// 	metadataDate = xmpMeta.getProperty(XMPConst.NS_XMP, "MetadataDate"); // metadataDate is a XMPProperty object
	// 	if($.level) $.writeln(metadataDate.value); // 2018-03-29T16:07:29+02:00

	// 		// 2021/04/14-00:39:44
	// 	// <xmp:MetadataDate>2018-03-29T16:07:29+02:00</xmp:MetadataDate>
	// 	var xmpDate = new XMPDateTime(metadataDate.value);
	// }
	// else
	// {
	// 	JSUI.alert("Property 'MetadataDate' not found!\nNamespace: " + XMPConst.NS_XMP);
	// }



    if($.level) $.writeln(metaString);


/*
// Register a new Namespace
Pslib.XMPNAMESPACE = "http://www.geeklystrips.com/";
Pslib.XMPNAMESPACEPREFIX = "gs:";

var namespace = Pslib.XMPNAMESPACE;
var prefix = Pslib.XMPNAMESPACEPREFIX;

XMPMeta.registerNamespace(Pslib.XMPNAMESPACE, Pslib.XMPNAMESPACEPREFIX);

// Setting a String
xmpMeta.setProperty(namespace, "retoucher", "Ding");

// Setting a Boolean
xmpMeta.setProperty(namespace, // Namespace
                    "hasBeenProcessed", // Property string
                    "true",             // Value string
                    0,                  // simple-valued property
                    XMPConst.BOOLEAN    // Property data type
);

// Setting a Date
xmpMeta.setProperty(namespace,             // Namespace
                    "lastExportationDate",       // Property string
                    new XMPDateTime(new Date()), // Value
                    0,                           // simple-valued property
                    XMPConst.XMPDATE             // Property data type
);

*/


    //JSUI.alert("Haiiii DataTypes LOLz\n" + pic.fsName);


};
