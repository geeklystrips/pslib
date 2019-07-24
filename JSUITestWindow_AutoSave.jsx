/*

    JSUI Test Window
    Auto-Save Settings


*/

#include "jsui.js";

#target photoshop;

// the toolname will be used to name the INI file
JSUI.TOOLNAME = "Test Window Auto-Save";
JSUI.populateINI();
JSUI.autoSave = true;

Main();

function Main()
{
    // this is the constructor for settings
    _prefs = function()
	{
        this.checkboxExample1 = true;
        this.checkboxExample2 = false;

		this.inputFolder = "~/Desktop/img";
		this.outputFolder = "~/Desktop/txt";
    
        this.radioButtonExample1 = true;
        this.radioButtonExample2 = false;
        this.radioButtonExample3 = false;

        this.dropdownlist = 5;

        this.listbox = null;

        this.fileSelect = "~/Desktop/img/image.png";
        this.fileReplace = "~/Desktop/txt/image.txt";


		return this;
	}

    // let's initiate the JSUI.PREFS object
    // if an INI file is found, previously stored settings are loaded
    // otherwise the default values from the constructor are used
    JSUI.PREFS = JSUI.readIniFile(new _prefs());
    
    // the close button does not show up on macOS.
    var win = new Window('dialog', JSUI.TOOLNAME, undefined, {closeButton: true});
    win.alignChildren = "left";
    win.margins = 15;
    win.spacing = 10;
    win.preferredSize.width = 700;

    // let's add one checkbox with a specific label, and a barebones checkbox without an object (the property name will be used instead)
    var checkboxExample1 = win.addCheckBox("checkboxExample1", { label: "Checkbox Example One" });
    var checkboxExample2 = win.addCheckBox("checkboxExample2");

    var inputFolder = win.addBrowseForFolder("inputFolder", { label: "Input Folder:", characters: 45, alignment: "right" } );
    var outputFolder = win.addBrowseForFolder("outputFolder", { label: "Output Folder:" } );

    var middleRow = win.addRow( { /*alignChildren: "fill"*/ } );

    var radioButtonPanel = middleRow.addPanel( { label: "Radiobuttons", alignment: "left", margins: 15, spacing: win.spacing } );

    // radiobuttons need to be aware of each other so that callback functions can affect the entire group
    // the current solution is to prepare an array with all the know elements, and pass the array to each radiobutton constructor 
    var radioButtonStrArr = [ "radioButtonExample1", "radioButtonExample2", "radioButtonExample3" ];

    var radioButtonExample1 = radioButtonPanel.addRadioButton("radioButtonExample1", { label: "Radiobutton Example One", array: radioButtonStrArr, helpTip: "This radiobutton has a helptip!"} );
    var radioButtonExample2 = radioButtonPanel.addRadioButton("radioButtonExample2", { array: radioButtonStrArr } );
    var radioButtonExample3 = radioButtonPanel.addRadioButton("radioButtonExample3", { array: radioButtonStrArr } );

    var middleColumn = middleRow.addColumn();

    // listbox component array
    var listboxElements = [ "0 - DIGIT ZERO Unicode: U+0030, UTF-8: 30",
                            "1 - DIGIT ONE Unicode: U+0031, UTF-8: 31",
                            "2 - DIGIT TWO Unicode: U+0032, UTF-8: 32",
                            "3 - DIGIT THREE Unicode: U+0033, UTF-8: 33"/*,
                            "4 - DIGIT FOUR Unicode: U+0034, UTF-8: 34",
                            "5 - DIGIT FIVE Unicode: U+0035, UTF-8: 35",
                            "6 - DIGIT SIX Unicode: U+0036, UTF-8: 36",
                            "7 - DIGIT SEVEN Unicode: U+0037, UTF-8: 37" */];

    // it looks like listbox support is broken with CC...?
    var listbox = middleColumn.addListBox("listbox", { label: "Listbox Component", list: listboxElements, multiselect: true});

    var dropdownlist = middleColumn.addDropDownList("dropdownlist", { label: "Dropdownlist Component", list: listboxElements, height: 20 });

    var fileSelect = win.addBrowseForFile("fileSelect", {  label: "File Selection:", characters: 45, filter: "png", helpTip: "Select PNG file" });
    var fileReplace = win.addBrowseForFileReplace("fileReplace", { label: "Replace File:", characters: 45, filter: "txt", helpTip: "Select TXT file"  });

    //
	var winButtonsRow = win.addRow( { alignChildren:'fill', alignment: "center", margins: 15 } );

    // when running the debugger ($.level == 1), this textfield will show some of the callback results
    // it will not show at all if JSX is run directly from Photoshop ($.level == 0)
	if($.level)
	{
        debugTxt = win.addStaticText( { width:600, text:"[Debug text goes here...]\n[...and here.]", disabled:true, multiline:true, height:100 } );
        
        // when debugging, having easy access to the INI file can be useful!
        winButtonsRow.addOpenINILocationButton( { label: "Reveal Settings"} );
    }

    // a close button is not technically necessary, you can just hit the Escape key
    var close = winButtonsRow.addButton( {label:"Close", name:"cancel", width: 150, height: 44, helpTip:"Close window"} );

     
    win.center();
	win.show();
}
