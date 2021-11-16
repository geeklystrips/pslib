/*
    GetSelectedLayers.jsx

    TODO
    Without making layer active
    - get layer ID
    - get layer kind 
    - get layer bounds (?) (fast version)
    - if layerset, look for placeholder layer (?) + specs

    if layer is artboard, proceed with different

    kinds enum index (?)
    
    raster = 1
    
    text layer = 3
    shape layer = 4
    smartobject = 5 // converted/placed/linked

    layerset = 7
    artboard = 7 // artboards seem to be internally treated as an object

    gradient = 9

    solid fill = 11
    

*/

#target photoshop;

#include "../jsui.js";

Main();

function Main()
{
    if(app.documents.length)
    {
        getSelectedLayers();
       //CopyCSSToClipboard();
    }
    else
    {
        JSUI.alert("No active document!");
    }
}

//
// layer IDs
//
// https://stackoverflow.com/questions/63448143/get-selected-layers

// get selected layers without disrupting the structure of currently selected layers
// will (likely) fail if only one layer is selected, no layers are selected
function getSelectedLayers()
{
  var layers = getSelectedLayersInfo();

  // if we _really_ want to get artLayers we can select them one by one with IDs
  for (var i = 0; i < layers.length; i++)
  {
    selectByID(layers[i].id);
   // alert(app.activeDocument.activeLayer.name);
  }
  
  // and reselecting everything back
  for (var i = 0; i < layers.length; i++)
  {
    selectByID(layers[i].id, true);
  }
  
}


function getSelectedLayersInfo()
{
    // doc info
    // var theNumber = applicationDesc.getInteger(stringIDToTypeID("numberOfLayers"));
  var lyrs = [];
  var lyr;
  var ref = new ActionReference();
  var desc;
  var tempIndex = 0;
  var ref2;
  ref.putProperty(stringIDToTypeID("property"), stringIDToTypeID("targetLayers"));
  ref.putEnumerated(charIDToTypeID('Dcmn'), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));

  var targetLayers = executeActionGet(ref).getList(stringIDToTypeID("targetLayers"));
  for (var i = 0; i < targetLayers.count; i++)
  {
    ref2 = new ActionReference();

    // if there's a background layer in the document, AM indices start with 1, without it from 0. ¯\_(ツ)_/¯ 
    try
    {
      activeDocument.backgroundLayer;
      ref2.putIndex(charIDToTypeID('Lyr '), targetLayers.getReference(i).getIndex());
      desc = executeActionGet(ref2);
      tempIndex = desc.getInteger(stringIDToTypeID("itemIndex")) - 1;

    }
    catch (o)
    {
      ref2.putIndex(charIDToTypeID('Lyr '), targetLayers.getReference(i).getIndex() + 1);
      desc = executeActionGet(ref2);
      tempIndex = desc.getInteger(stringIDToTypeID("itemIndex"));
    }

    lyr = {};
    lyr.index = tempIndex;
    lyr.id = desc.getInteger(stringIDToTypeID("layerID"));
    lyr.name = desc.getString(charIDToTypeID("Nm  "));
    // https://community.adobe.com/t5/photoshop-ecosystem-discussions/how-can-i-get-an-enumeration-value-from-an-effect-s-property/m-p/10596670#M261630
    lyr.type = desc.getInteger(stringIDToTypeID("layerKind")); // needs proper conversion
    //lyr.type = desc.getString(charIDToTypeID("layerKind"));

    //if( desc.hasKey( stringIDToTypeID( 'adjustment' ) ) ){
    // if($.level) $.writeln( typeIDToStringID(desc.getList (stringIDToTypeID('adjustment')).getClass (0) )
    // if($.level) $.writeln( "  class: " + desc.getList (stringIDToTypeID('layerKind')).getClass (0) );

    
    // https://www.ps-scripts.com/viewtopic.php?f=66&t=9063&p=44763&hilit=getInteger+LayerID#p44763
    // XMP info (?)
    // try {
    //     var ref = new ActionReference();
    //     ref.putProperty( charIDToTypeID( 'Prpr' ), stringIDToTypeID( "metadata" ) );
    //     ref.putIndex( charIDToTypeID( "Lyr " ), m);
    //     var layerDesc = executeActionGet(ref);
    //     var theXMP = layerDesc.getObjectValue(stringIDToTypeID( "metadata" )).getString(stringIDToTypeID( "layerXMP" ));
    //     theLayers.push([theName, theID, theXMP])
    //     }
    //  catch (e) {
    //  //   theLayers.push([theName, theID, /*theXMP*/])
    //     };


    lyrs.push(lyr);

    if($.level) $.writeln(lyr.id + ": " + lyr.name + "  kind: " + lyr.type); 

  }

  return lyrs;
}

function selectByID(id, add) {
    if (add == undefined) add = false;
    var desc1 = new ActionDescriptor();
    var ref1 = new ActionReference();
    ref1.putIdentifier(charIDToTypeID('Lyr '), id);
    desc1.putReference(charIDToTypeID('null'), ref1);
    if (add) desc1.putEnumerated(stringIDToTypeID("selectionModifier"), stringIDToTypeID("selectionModifierType"), stringIDToTypeID("addToSelection"));
    executeAction(charIDToTypeID('slct'), desc1, DialogModes.NO);
} // end of selectByID()

// xbytor
function getActiveLayerID() {
    var ref = new ActionReference();
    ref.putEnumerated(cTID('Lyr '), cTID('Ordn'), cTID('Trgt'));
    var ldesc = executeActionGet(ref);
    return ldesc,getInteger(cTID('LyrI'));
};

// https://www.ps-scripts.com/viewtopic.php?t=8666 (Mike Hale)
function getLayerKindByIndex( index ) {
    var ref, desc, adjustmentDesc, layerSectionType;
    ref = new ActionReference();
    ref.putIndex(charIDToTypeID( "Lyr " ), index );
    desc =  executeActionGet(ref);
    var layerType = typeIDToStringID(desc.getEnumerationValue( stringIDToTypeID( 'layerSection' )));
    if( layerType != 'layerSectionContent' ) return;// return if layerSet
 
  
 
    if( desc.hasKey( stringIDToTypeID( 'textKey' ) ) ) return LayerKind.TEXT;
    if( desc.hasKey( stringIDToTypeID( 'smartObject' ) ) ) return LayerKind.SMARTOBJECT;// includes LayerKind.VIDEO
    if( desc.hasKey( stringIDToTypeID( 'layer3D' ) ) ) return LayerKind.LAYER3D;
    if( desc.hasKey( stringIDToTypeID( 'adjustment' ) ) ){
       switch(typeIDToStringID(desc.getList (stringIDToTypeID('adjustment')).getClass (0))){
          case 'photoFilter' : return LayerKind.PHOTOFILTER;
          case 'solidColorLayer' : return LayerKind.SOLIDFILL;
          case 'gradientMapClass' : return LayerKind.GRADIENTMAP;
          case 'gradientMapLayer' : return LayerKind.GRADIENTFILL;
          case 'hueSaturation' : return LayerKind.HUESATURATION;
          case 'colorLookup' : return udefined; //this does not exist and errors with getting layer kind
          case 'colorBalance' : return LayerKind.COLORBALANCE;
          case 'patternLayer' : return LayerKind.PATTERNFILL;
          case 'invert' : return LayerKind.INVERSION;
          case 'posterization' : return LayerKind.POSTERIZE;
          case 'thresholdClassEvent' : return LayerKind.THRESHOLD;
          case 'blackAndWhite' : return LayerKind.BLACKANDWHITE;
          case 'selectiveColor' : return LayerKind.SELECTIVECOLOR;
          case 'vibrance' : return LayerKind.VIBRANCE;
          case 'brightnessEvent' : return LayerKind.BRIGHTNESSCONTRAST;
          case  'channelMixer' : return LayerKind.CHANNELMIXER;
          case 'curves' : return LayerKind.CURVES;
          case 'exposure' : return LayerKind.EXPOSURE;
          // if not one of the above adjustments return - adjustment layer type
          default : return typeIDToStringID(desc.getList (stringIDToTypeID('adjustment')).getClass (0));
       }
    }
     return LayerKind.NORMAL;// if we get here normal should be the only choice left.
 };

