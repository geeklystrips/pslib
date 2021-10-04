/*

    JSUI Test Window
    XML


*/

#include "jsui.js";

#target photoshop;

JSUI.TOOLNAME = "JSUI XML Test";
JSUI.populateXML();

JSUI.PREFS = {};
JSUI.PREFS.exampleBoolean = true;
JSUI.PREFS.exampleString = "Hi!";
JSUI.PREFS.exampleNumber = 123.45;
JSUI.PREFS.strArr = [ "one", "two", "three"];
JSUI.PREFS.numArr = [ 1, 2, 3];
JSUI.PREFS.boolArr = [ true, true, false];


Main();

function Main()
{

    // this serializes the JSUI.PREFS object to XML
    JSUI.saveXMLfile();

    /*

    <JSUIPREFS>
      <exampleBoolean>true</exampleBoolean>
      <exampleString>Hi!</exampleString>
      <exampleNumber>123.45</exampleNumber>
      <strArr>
        <strArr>one</strArr>
        <strArr>two</strArr>
        <strArr>three</strArr>
      </strArr>
      <numArr>
        <numArr>1</numArr>
        <numArr>2</numArr>
        <numArr>3</numArr>
      </numArr>
    </JSUIPREFS>

    */

    // testing custom object to XML stuff
    var obj = {};

    obj.bool = true;
    obj.num = 1.23;
    obj.str = "oh HAI iz <STRING> lol";

      obj.strArr = [ "one", "two", "three"];
      obj.numArr = [ 1, 2, 3];
      obj.boolArr = [ true, true, false];

    // convert object to XML string
    var xml = JSUI.toXML ( obj, "Output");

    JSUI.writeXMLfile( xml, new File(JSUI.XMLFILE.parent + "/writeCustomXML.xml"));

    /*
      <Output>
        <bool>true</bool>
        <num>1.23</num>
        <str>oh%20HAI%20iz%20%3CSTRING%3E%20lol</str>
        <strArr>
          <strArr>one</strArr>
          <strArr>two</strArr>
          <strArr>three</strArr>
        </strArr>
        <numArr>
          <numArr>1</numArr>
          <numArr>2</numArr>
          <numArr>3</numArr>
        </numArr>
        <boolArr>
          <boolArr>true</boolArr>
          <boolArr>true</boolArr>
          <boolArr>false</boolArr>
        </boolArr>
      </Output>


    */

      // test serializing to the attribute
      var xmlattr = JSUI.toXML ( obj, "Output", true);

      JSUI.writeXMLfile( xmlattr, new File(JSUI.XMLFILE.parent + "/writeCustomXML_Attr.xml"));


      /*





      */

if(xml != null)
{
  var xmlStr = xml.toXMLString();

  //   JSUI.alert(xmlStr);
   if($.level) $.writeln(xmlStr);
}

};