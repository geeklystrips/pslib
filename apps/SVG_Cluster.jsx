#include "../jsui.js";

#target photoshop;


Main();

function Main()
{
  // data structure template
  var documentTags = ["Name", "Location", "Status", "Hierarchy", "Density"]; // these belong on the active document
  
  var layerObjectTags = ["Name", "LayerID", "Format"]; // these are used to track custom properties


  // build main parent object
  var obj = {};
  obj.isParent = true;
  obj.isChild = false;
  obj.hasTags = true;

  // build child object
  var child = {};
  child.isParent = false;
  child.isChild = true;
  child.hasTags = true;

};

