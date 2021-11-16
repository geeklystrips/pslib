/*
    XMP_DocLayerSync.jsx

    - Tests and validates synchronization of XMP tags 
    - Goal: tags must be easily accessible on PSD and AI documents using software like ExifTool


    Within a PSD file, per-layer metadata is possible but should be automatically synced with document header when updated.

    Illustrator files do not have this possibility, we will therefore rely on group names (as the Asset Export module would)

    Let's make use of XMPDate stamps to determine if content was updated.

    Syncing confirmation and conflict resolve UI

*/

#include "../Pslib.jsx";
#include "../jsui.js";

#target photoshop;


Main();

function Main()
{
  // data structure template: to be managed using external JSON
  //                [ "PhotoshopDocument.psd", "/c/sources/tests/", "Managed", "Parent", "Layers", "Hi-DPI" ];
  var documentTags = [ "Name", "Location", "Status", "Hierarchy", "ExportType", "Density" ]; // these belong on the active document
  var documentAltArrName = "TagSync"; 
  
  //                  [ "PshopLayersetName", null, "PNG" ];
  //                  [ "AiArtworkGroupName", "12", "PNG" ];
  var targetObjectTags = [ "Name", "UniqueID", "Format" ]; // these are used to track custom property values with document header


  // // build main parent object
  // var obj = {};
  // obj.isParent = true;
  // obj.isChild = false;
  // obj.hasTags = true;

  // // build child object
  // var child = {};
  // child.isParent = false;
  // child.isChild = true;
  // child.hasTags = true;

  // work with test file
  var testFile = new File( new File($.fileName).parent + "/img/PhotoshopDocument.psd");

  if(testFile.exists)
  {
    // open file
    var doc = app.open(testFile);

    // load AdobeXMPScript if not available
    if(ExternalObject.AdobeXMPScript == undefined)
    {
      if($.level) $.writeln("Loading ExternalObject.AdobeXMPScript");
      ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    }

    // setting namespace (uncomment if different namespace is needed)
    // Pslib.XMPNAMESPACE = "http://www.geeklystrips.com/";
    // Pslib.XMPNAMESPACEPREFIX = "gs:";

    XMPMeta.registerNamespace(Pslib.XMPNAMESPACE, Pslib.XMPNAMESPACEPREFIX);

    // new XMPFile object
    var xmpFile = new XMPFile(testFile.fsName,
                                XMPConst.FILE_PHOTOSHOP, // XMPConst.UNKNOWN
                                XMPConst.OPEN_FOR_READ);

    // create XMPMeta object to work with
    var docXmp = xmpFile.getXMP();

    // JSUI.alert( docXmp.serialize() );
    //if($.level) $.writeln( docXmp.serialize() );

    //var twoDimensionArray = [ ["propertyname1", null], ["propertyname2", null], ["propertyname3", null] ]; 
    var docDict = Pslib.getXmpDictionary( doc, documentTags, true);//, typeCaseBool)
    var targetObjDict = Pslib.getXmpDictionary( doc.activeLayer, targetObjectTags, true);

    // alert(docDict.Location);

    // this only works if the document is already open
    // Pslib.setXmpProperties( doc, docDict );
    // var keysArr = DictObjToArray(docDict);


      // deal with "~" if present
      // // new XMPFile(psdFile.fullName.replace("~", $.getenv("HOME"))
      
      // var customArr = [];
      // customArr.push([ "Name", doc.name ]);
      // customArr.push([ "Location", "img/" ]); //doc.path ]);
      // customArr.push([ "Status", "Managed" ]);
      // customArr.push([ "Hierarchy", "Parent" ]);
      // customArr.push([ "ExportType", "Layersets" ]);
      // customArr.push([ "Density", "Standard" ]);

      // var success = Pslib.setXmpProperties( doc, customArr );

      // prepare placeholder array for tag syncing

      // with Photoshop, get xmp from layer
      var target = doc.activeLayer;
      var targetXmp = Pslib.getXmp(target, true); // 2nd arg: create empty XMP if not found

      // var targetTagsArr = [];
      // targetTagsArr.push( [ "Name", target.name ] );
      // targetTagsArr.push( [ "UniqueID", getLayerID() ] );
      // targetTagsArr.push( [ "Format", "PNG" ] );

      // _setStruct( targetXmp, documentAltArrName, targetObjDict ); // do NOT use a struct on a layer, instead use individual properties

     // Pslib.setXmpProperties( target, targetTagsArr );

      // now that the document has a list of tags and the layer has its own, let's attempt to sync them
      SyncTargetToDoc(); //targetXMP, docXMP, dictObj)

      // show result (get XMP)
      //JSUI.alert( Pslib.getXmp(target, true).serialize() );

      // if(_setStruct( targetXmp, documentAltArrName, targetObjDict ))
      // {
      //   JSUI.alert("XMP _setStruct Success!");
      // }
  }
  else
  {
    JSUI.alert("File not found!\n\n" + testfile.fsName);
  }


};


// we need a function for directly storing object properties as XMP tags

// send a copy of target tags to 
// option to force override destination
// option to present user with information / override confirmation
function SyncTargetToDoc(targetXMP, docXMP, dictObj)
{
  // get all current properties
  var targetArr = Pslib.getPropertiesArray( app.activeDocument.activeLayer );

  var docArr = Pslib.getPropertiesArray( app.activeDocument );

  //JSUI.alert( targetArr.toString().replace(/,/g, "\n") +  docArr.toString().replace(/,/g, "\n"));

}

function SyncDocToTarget(docXMP, targetXMP, dictObj)
{

}

// show sync status (show conflicts if present)
function ValidateSync(docXMP, targetXMP, dictObj)
{

}

// --

function getLayerID()
{
  if(Pslib.isPhotoshop)
  {
    if(app.documents.length)
    {
      var ref = new ActionReference();
      ref.putEnumerated(cTID('Lyr '), cTID('Ordn'), cTID('Trgt')); // reference is active layer
      var layerDesc = executeActionGet(ref);
      var layerID = layerDesc.getInteger(stringIDToTypeID('layerID'));
      // alert(layerID);
      return layerID;
    }
    else
    {
      return;
    }
  }
  else
  {
    return;
  }
};

// 
//


// convert dictionary object to usable array 
function DictObjToArray( dictObj )
{
  var arr = [];
  var props = dictObj.reflect.properties;

  for (var idx in props)
  {
    // get property name
    var p = props[idx];

    // weed out private properties
    if(p == "length" || p == "__proto__" || p == "__count__" || p == "__class__" || p == "reflect" || p == "Components" || p == "typename") continue;

    // store corresponding object value
    var v = dictObj[p];

    arr.push( [ p, v ]);
    if($.level) $.writeln( p + ": " + v );
  }
  return arr;
};

// set structure
function _setStruct( xmpObj, objName, obj )
{
  var increment = 0;

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

    xmpObj.setStructField(Pslib.XMPNAMESPACE,    	// Namespace
              objName,    		// Structure name
              Pslib.XMPNAMESPACE,    		// Field type namespace
              property,           // Key
              value, 				// Value
              0                   // default type value
    );
    //alert(objName + "." + prop + ": " + obj[prop]);
    increment++;
  }
  return increment > 0;
}

// populate object properties from (known) struct
function _getStruct( xmpObj, objName, obj )
{
  if(xmpObj.doesPropertyExist(Pslib.XMPNAMESPACE, objName))
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

      obj[property] = xmpObj.getStructField(Pslib.XMPNAMESPACE,    // Namespace
                objName,    					// Structure name
                Pslib.XMPNAMESPACE,    					// Field type namespace
                property           				// Key
      );
      //alert(objName + "." + prop + ": " + obj[prop]);
    }
    return obj;
  }
  else return {};
}

