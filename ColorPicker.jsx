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
    
    var win = JSUI.createDialog( { title: JSUI.TOOLNAME, orientation: "column", width: 400 }); //, alignChildren: "left" } );

    // add panel for first set of color picker controls
    var panel1 = win.addPanel( { label: "Custom Controls", alignment: "fill"} );

    // cannot use obj.onChangingFunction here  
    var colorPicker1 = panel1.addColorPicker("colorPicker1", { label: "Color 1", value: JSUI.PREFS.colorPicker1, onClickFunction: _updateRGBvalues, width: 32, height: 32, spacing: 10, helpTip: "Choose color using system color picker"});

    var color1Row = panel1.addRow( { spacing: 25} );
    var col1 = color1Row.addColumn();
    var col2 = color1Row.addColumn();

    // add panel for first set of color picker controls
    var panel2 = win.addPanel( { label: "Generic Controls", alignment: "fill"} );
    var colorPicker2 = panel2.addColorPicker("colorPicker2", { label: "Color 2", value: JSUI.PREFS.colorPicker2, orientation: "column", alignChildren: "center",  width: 50, height: 50, spacing: 10, helpTip: "Choose color using system color picker"});

    var rgb_R = col1.addEditText("rgb_R", { label: "R", value: JSUI.PREFS.rgb_R, characters: 4, onChangingFunction: _updatePicker1FromInts, specs: { useGroup: true, orientation: "row"} });
    var rgb_G = col1.addEditText("rgb_G", { label: "G", value: JSUI.PREFS.rgb_G, characters: 4, onChangingFunction: _updatePicker1FromInts, specs: { useGroup: true, orientation: "row"} });
    var rgb_B = col1.addEditText("rgb_B", { label: "B", value: JSUI.PREFS.rgb_B, characters: 4, onChangingFunction: _updatePicker1FromInts, specs: { useGroup: true, orientation: "row"} });
    
    var rgb_nR = col2.addEditText("rgb_nR", { label: "R", value: JSUI.PREFS.rgb_nR, characters: 10, specs: { useGroup: true, orientation: "row"} });
    var rgb_nG = col2.addEditText("rgb_nG", { label: "G", value: JSUI.PREFS.rgb_nG, characters: 10, specs: { useGroup: true, orientation: "row"} });
    var rgb_nB = col2.addEditText("rgb_nB", { label: "B", value: JSUI.PREFS.rgb_nB, characters: 10, specs: { useGroup: true, orientation: "row"} });

    var color2Row = panel2.addRow(  { spacing: 25} );
    var col21 = color2Row.addColumn();
    var col22 = color2Row.addColumn();

    var rgb2_R = col21.addNumberInt("rgb2_R", { label: "R", value: JSUI.PREFS.rgb2_R, hexValue: "FF0000", characters: 4, step:8, clamp: true, min: 0, max: 255, onChangingFunction: _updateRGB2values });
    var rgb2_G = col21.addNumberInt("rgb2_G", { label: "G", value: JSUI.PREFS.rgb2_G, hexValue: "00FF00", characters: 4, clamp: true, min: 0, max: 255, onChangingFunction: _updateRGB2values });
    var rgb2_B = col21.addNumberInt("rgb2_B", { label: "B", value: JSUI.PREFS.rgb2_B, hexValue: "0000FF", characters: 4, clamp: [0, 255], controls: true, onChangingFunction: _updateRGB2values });
    
    var rgb2_nR = col22.addNumberFloat("rgb2_nR", { label: "R", value: JSUI.PREFS.rgb2_nR, characters: 10, decimals: 8, step: 0.05, clamp: [0.0, 1.0], onChangingFunction: _udpateRGB2ints  });
    var rgb2_nG = col22.addNumberFloat("rgb2_nG", { label: "G", value: JSUI.PREFS.rgb2_nG, characters: 10, decimals: 8, step: 0.05, clamp: [0.0, 1.0], onChangingFunction: _udpateRGB2ints  });
    var rgb2_nB = col22.addNumberFloat("rgb2_nB", { label: "B", value: JSUI.PREFS.rgb2_nB, characters: 10, decimals: 8, step: 0.05, clamp: true, min: 0, max: 1.0, onChangingFunction: _udpateRGB2ints  });

	var winButtonsRow = win.addRow( { alignChildren:'fill', alignment: "center", margins: 15 } );

	if($.level)
	{
        debugTxt = win.addStaticText( { width:325, text:"[Debug text goes here...]\n[...and here.]", disabled:true, multiline:true, height:100 } );       
      //  winButtonsRow.addOpenINILocationButton( { label: "Reveal Settings" } );
    }

    // this function updates values for edittext fields based on the current colorpicker1's hexString 
    // arguments are optional, so you can update a group without modifying the other one
    function _updateRGBvalues( updateIntsBool, updateFloatsBool, saveBool )
    {
        var updateIntsBool = updateIntsBool != undefined ? updateIntsBool : true; // true by default for onClickFunction because it does not accept arguments
        var updateFloatsBool = updateFloatsBool != undefined ? updateFloatsBool : true; 
        var saveBool = saveBool != undefined ? saveBool : true;

        // parseInt("FF8000", 16) yields a value of 16744448 (integer)
        var hex = parseInt(JSUI.PREFS.colorPicker1, 16);
        
        // 16744448 represented as hexadecimal is 0xFF8000

        // bitwise operators are friendlier in terms of performance
        var r = hex >> 16;  // bitwise right shift 0xFF8000 sixteen times results in 0xFF (255 for red)
        var g = hex >> 8 & 0xFF; // bitwise right shift 0xFF8000 eight times results in 0xFF80, AND 0xFF, results in 0x80 (128 for blue)
        var b = hex & 0xFF; // 0xFF8000, AND 0xFF, results in 0x00 (0 for green)

        if(updateIntsBool)
        {
            rgb_R.text = r;
            rgb_G.text = g;
            rgb_B.text = b;
        }

        if(updateFloatsBool)
        {
            rgb_nR.text = r / 255;
            rgb_nG.text = g / 255;
            rgb_nB.text = b / 255;
        }

        if(saveBool)
        {
            // trigger saving preferences
            if(JSUI.autoSave) JSUI.saveIniFile();
        }
    };

    function _updatePicker1FromInts()// hexStr, updateIntsBool, updateFloatsBool )
    {
        // var updateIntsBool = updateIntsBool != undefined ? updateIntsBool : true; // true by default for onClickFunction because it does not accept arguments
        // var updateFloatsBool = updateFloatsBool != undefined ? updateFloatsBool : true; 
       // var saveBool = saveBool != undefined ? saveBool : true;
       var hexStr = JSUI.RGBtoHex(rgb_R.text, rgb_G.text, rgb_B.text);
       colorPicker1.update(hexStr);

    };

    function _updateRGB2values( updateIntsBool, updateFloatsBool)
    {
      //  if($.level) $.writeln( "R:"+rgb2_R.text+" G:" +rgb2_G.text+" B:" + rgb2_B.text + "  Hex: " + JSUI.RGBtoHex(rgb2_R.text, rgb2_G.text, rgb2_B.text));
        var hexStr = JSUI.RGBtoHex(rgb2_R.text, rgb2_G.text, rgb2_B.text);

        // update picker color from modified field values
        colorPicker2.update(hexStr);


    };

    function _udpateRGB2ints()
    {
        rgb2_R.text = parseInt(Number(rgb2_nR.text * 255));
        rgb2_G.text = parseInt(Number(rgb2_nG.text * 255));
        rgb2_B.text = parseInt(Number(rgb2_nB.text * 255));

        var hexStr = JSUI.RGBtoHex(rgb2_R.text, rgb2_G.text, rgb2_B.text);

        // update picker color from modified field values
        colorPicker2.update(hexStr);

    };

    winButtonsRow.addCloseButton();     

   // apply individual values to R, G, B fields based on current HexString values (from INI if found, or default prefs object)
    _updateRGBvalues( true, true, false );
    _updateRGB2values();

    win.center();
	win.show();
}

