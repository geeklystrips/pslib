/*

    JSUI ColorPicker sample
    
    introducing 
    - addNumberInt
    - addNumberFloat

*/

#include "jsui.js"

#target photoshop;
//#target illustrator;


JSUI.TOOLNAME = "JSUI ColorPicker";
JSUI.populateINI();
JSUI.autoSave = true;


Main();

function Main()
{
    // this is the constructor for settings
    _prefs = function()
	{
        this.colorPicker1 = "FF8000";
        this.colorPicker2 = "0080FF";

        this.rgb_R = "0";
        this.rgb_G = "0";
        this.rgb_B = "0";

        this.rgb_nR = "0.0";
        this.rgb_nG = "0.0";
        this.rgb_nB = "0.0";

        this.rgb2_R = "0";
        this.rgb2_G = "0";
        this.rgb2_B = "0";

        this.rgb2_nR = "0.0";
        this.rgb2_nG = "0.0";
        this.rgb2_nB = "0.0";

        this.intTest = "1.2345";
        this.floatTest = "0.00231";

		return this;
	}

    JSUI.PREFS = JSUI.readIniFile(new _prefs());    
    
    var win = JSUI.createDialog( { title: JSUI.TOOLNAME, orientation: "column", alignChildren: "left" } );

    var colorPicker1 = win.addColorPicker("colorPicker1", { label: "Color 1", value: JSUI.PREFS.colorPicker1, /*onChangingFunction: _updateRGBvalues,*/ width: 32, height: 32, helpTip: "Choose color using system color picker"});

    var color1Row = win.addRow();
    var col1 = color1Row.addColumn();
    var col2 = color1Row.addColumn();

    var colorPicker2 = win.addColorPicker("colorPicker2", { label: "Color 2", value: JSUI.PREFS.colorPicker2, width: 32, height: 32, helpTip: "Choose color using system color picker"});

    var rgb_R = col1.addEditText("rgb_R", { label: "R", value: JSUI.PREFS.rgb_R, width: 40, specs: { useGroup: true, orientation: "row"} });
    var rgb_G = col1.addEditText("rgb_G", { label: "G", value: JSUI.PREFS.rgb_G, width: 40, specs: { useGroup: true, orientation: "row"} });
    var rgb_B = col1.addEditText("rgb_B", { label: "B", value: JSUI.PREFS.rgb_B, width: 40, specs: { useGroup: true, orientation: "row"} });
    
    var rgb_nR = col2.addEditText("rgb_nR", { label: "R", value: JSUI.PREFS.rgb_nR, width: 75, specs: { useGroup: true, orientation: "row"} });
    var rgb_nG = col2.addEditText("rgb_nG", { label: "G", value: JSUI.PREFS.rgb_nG, width: 75, specs: { useGroup: true, orientation: "row"} });
    var rgb_nB = col2.addEditText("rgb_nB", { label: "B", value: JSUI.PREFS.rgb_nB, width: 75, specs: { useGroup: true, orientation: "row"} });

    var color2Row = win.addRow();
    var col21 = color2Row.addColumn();
    var col22 = color2Row.addColumn();

    var rgb2_R = col21.addNumberInt("rgb2_R", { label: "R", value: JSUI.PREFS.rgb2_R, width: 40, onChangingFunction: _updateRGB2values });
    var rgb2_G = col21.addNumberInt("rgb2_G", { label: "G", value: JSUI.PREFS.rgb2_G, width: 40, onChangingFunction: _updateRGB2values });
    var rgb2_B = col21.addNumberInt("rgb2_B", { label: "B", value: JSUI.PREFS.rgb2_B, width: 40, onChangingFunction: _updateRGB2values });
    
    var rgb2_nR = col22.addNumberFloat("rgb2_nR", { label: "R", value: JSUI.PREFS.rgb2_nR, width: 75, decimals: 5 });
    var rgb2_nG = col22.addNumberFloat("rgb2_nG", { label: "G", value: JSUI.PREFS.rgb2_nG, width: 75, decimals: 5 });
    var rgb2_nB = col22.addNumberFloat("rgb2_nB", { label: "B", value: JSUI.PREFS.rgb2_nB, width: 75, decimals: 5 });

   // var intTest = win.addNumberInt("intTest", { label: "int", value: JSUI.PREFS.intTest, characters: 6, helpTip: "I AM INTEGER LOL" });
   // var floatTest = win.addNumberFloat("floatTest", { label: "float", value: JSUI.PREFS.floatTest, characters: 12, decimals: 3, helpTip: "I AM FLOAT LOL" });
	var winButtonsRow = win.addRow( { alignChildren:'fill', alignment: "center", margins: 15 } );

	if($.level)
	{
        debugTxt = win.addStaticText( { width:300, text:"[Debug text goes here...]\n[...and here.]", disabled:true, multiline:true, height:100 } );       
        winButtonsRow.addOpenINILocationButton( { label: "Reveal Settings" } );
    }

    function _updateRGBvalues()
    {
        var hex = parseInt(JSUI.PREFS.colorPicker1, 16);

	//	var rgb = [hex >> 16,  hex >> 8 & 0xFF,  hex & 0xFF];
        var r = hex >> 16;
        var g = hex >> 8 & 0xFF;
        var b = hex & 0xFF;

        rgb_R.text = r;
        rgb_G.text = g;
        rgb_B.text = b;

        rgb_nR.text = r / 255;
        rgb_nG.text = g / 255;
        rgb_nB.text = b / 255;

        // var hex2 = parseInt(JSUI.PREFS.colorPicker2, 16);

        // var r2 = hex2 >> 16;
        // var g2 = hex2 >> 8 & 0xFF;
        // var b2 = hex2 & 0xFF;

        // rgb2_R.text = r2;
        // rgb2_G.text = g2;
        // rgb2_B.text = b2;

        // rgb2_nR.text = r2 / 255;
        // rgb2_nG.text = g2 / 255;
        // rgb2_nB.text = b2 / 255;

		//var result_color = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]; 
       //if($.level) $.writeln("Updating textfields: " + r + ", " + g + ", " + b);
    };

    function _updateRGB2values()
    {
       // var hex = parseInt(JSUI.PREFS.colorPicker2, 16);

	//	var rgb = [hex >> 16,  hex >> 8 & 0xFF,  hex & 0xFF];
        // var r = hex >> 16;
        // var g = hex >> 8 & 0xFF;
        // var b = hex & 0xFF;

        // rgb2_R.text = r;
        // rgb2_G.text = g;
        // rgb2_B.text = b;

        // rgb2_nR.text = r / 255;
        // rgb2_nG.text = g / 255;
        // rgb2_nB.text = b / 255;
        var hexStr = JSUI.RGBtoHex(rgb2_R.text, rgb2_G.text, rgb2_B.text);

        // update picker color from modified field values
        colorPicker2.update(hexStr);
    };

    winButtonsRow.addCloseButton();     

    // testing for invalid image URI
    //win.addImage( { imgFile: "img/oh_hai.png"} );

    // add event listener on Window ?
    //win.addEventListener( "updateRGB", _updateRGBvalues, false);
   // rgb_R.addEventListener( "mouseover", _updateRGBvalues, false);

  //  _updateRGBvalues();
  //  _updateRGB2values();

    win.center();
	win.show();

   // JSUI.prompt( { message: "oh HAI!", imgFile: "img/placeholder.png" } );
}

