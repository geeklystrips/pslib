/*

    JSUI Test Window
    Auto-Save Settings

    * upgraded to JSON prefs storage
*/

#include "jsui.js"

#target photoshop;


// 
Main();

function Main()
{
    // the toolname will be used to name the JSON file
    JSUI.TOOLNAME = "JSUI Test Window";

    // JSUI.populateJSON( uri ) sets autosaving, defines location of JSUI.JSONFILE (bypass default if needed with optional uri arg - a File object)
    // JSUI.autoSave = true;
	// JSUI.JSONfileActive = true;

    JSUI.populateJSON();

    // this is the constructor for default settings
    _prefs = function()
	{
        this.checkboxExample1 = true;
        this.checkboxExample2 = false;

		this.inputFolder = "~/Desktop/img";
		this.outputFolder = "~/Desktop/txt";
    
        this.radioButtonExample1 = true;
        this.radioButtonExample2 = false;
        this.radioButtonExample3 = false;

        this.radioButtonExample4 = true;
        this.radioButtonExample5 = false;
        this.radioButtonExample6 = false;

        this.radioButtonExample7 = true;
        this.radioButtonExample8 = false;
        this.radioButtonExample9 = false;

        this.dropdownlist = 5;

        this.listbox = null;

        this.fileSelect = "~/Desktop/img/image.png";
        this.fileReplace = "~/Desktop/txt/image.txt";

        this.anchorPos = "AnchorPosition.MIDDLECENTER"; // allow storing as number?

		return this;
	}

    // let's initialize the JSUI.PREFS object
    // if a JSON file is found, previously stored settings are loaded
    // otherwise the default values from the constructor are used
    JSUI.PREFS = JSUI.readJSONfile(new _prefs()); //, JSUI.JSONFILE);
    
    // the close button does not show up on macOS.
   // var win = new Window('dialog', JSUI.TOOLNAME, undefined, {closeButton: true});
    var win = JSUI.createDialog( { title: JSUI.TOOLNAME, orientation: "column", width: 400, margins: 15, spacing: 10, alignChildren: "fill" });

    var mainRow = win.addRow ( );

    var leftColumn = mainRow.addColumn({ alignChildren: "fill" });
    var middleRow = leftColumn.addRow( { /*alignChildren: "fill"*/ } );
    var middleColumn = mainRow.addColumn( { margins: 10, spacing: 10} );
    var rightColumn = mainRow.addColumn();

    var checkboxesPanel = leftColumn.addPanel( { label: "Checkboxes", alignment: "fill" } );

    // let's add one checkbox with a specific label, and a barebones checkbox without an object (the property name will be used instead)
    var checkboxExample1 = checkboxesPanel.addCheckBox("checkboxExample1", { label: "Checkbox Example One" });
    var checkboxExample2 = checkboxesPanel.addCheckBox("checkboxExample2");

    var folderInputOutputPanel = rightColumn.addPanel( { label: "Files/Folders I/O",  alignment: "left", alignChildren: "fill" });
    var inputFolder = folderInputOutputPanel.addBrowseForFolder("inputFolder", { label: "Input Folder:", characters: 45, alignment: "right" } );
    var outputFolder = folderInputOutputPanel.addBrowseForFolder("outputFolder", { label: "Output Folder:" } );
    folderInputOutputPanel.addDividerRow();



    var radioButtonPanel = leftColumn.addPanel( { label: "Radiobuttons", alignment: "left", alignChildren: "fill", margins: 15, spacing: win.spacing } );

    // radiobuttons need to be aware of each other so that callback functions can affect the entire group
    // the current solution is to prepare an array with all the known property names as strings, and pass the array to each radiobutton constructor
    radioButtonPanel.addStaticText( {text:"addRadioButton array"});
    var radioButtonStrArr = [ "radioButtonExample1", "radioButtonExample2", "radioButtonExample3" ];

    var radioButtonExample1 = radioButtonPanel.addRadioButton("radioButtonExample1", { label: "Radiobutton Example One", array: radioButtonStrArr, helpTip: "This radiobutton has a helptip!"} );
    var radioButtonExample2 = radioButtonPanel.addRadioButton("radioButtonExample2", { array: radioButtonStrArr } );
    var radioButtonExample3 = radioButtonPanel.addRadioButton("radioButtonExample3", { array: radioButtonStrArr } );

    radioButtonPanel.addDividerRow();

    // radioButtonPanel.addDividerRow();
    radioButtonPanel.addStaticText( { text:"addToggleIconGroup images array" });
    var imgButtonsGroup = radioButtonPanel.addRow();
    var radiobuttonImgLogicObj = {   
        propertyNames: ['radioButtonExample7', 'radioButtonExample8', 'radioButtonExample9'],
        labels:        ["Radiobutton 7", "Radiobutton 8", "Radiobutton 9",],
        helpTips:      ["Radiobutton Example Seven", "Radiobutton Example Eight", "Radiobutton Example Nine"],
         images: [ "img/Radiobutton.png", "img/Radiobutton.png", "img/Radiobutton.png"],
         selection: 0 
          };
        imgButtonsGroup.addToggleIconGroup( radiobuttonImgLogicObj );

    var radioButtonSubPanel = leftColumn.addPanel( { label: "Additional Radiobuttons", alignment: "fill", alignChildren: "fill", margins: 15, spacing: win.spacing } );
    radioButtonSubPanel.addStaticText( {text:"addToggleIconGroup array"});

    // this method supports ToggleIcons if you provide images. Otherwise defaults to plain radiobuttons
        var radiobuttonLogicObj = {   
        propertyNames: ['radioButtonExample4', 'radioButtonExample5', 'radioButtonExample6'],
        labels:        ["Radiobutton 4", "Radiobutton 5", "Radiobutton 6",],
        helpTips:      ["Radiobutton Example Four", "Radiobutton Example Five", "Radiobutton Example Six"]
        // ,
        //  images: [ "", "", ""] 
          };
          radioButtonSubPanel.addToggleIconGroup( radiobuttonLogicObj );

    // listbox component array
    var listboxElements = [ "0 - DIGIT ZERO Unicode: U+0030, UTF-8: 30",
                            "1 - DIGIT ONE Unicode: U+0031, UTF-8: 31",
                            "2 - DIGIT TWO Unicode: U+0032, UTF-8: 32",
                            "3 - DIGIT THREE Unicode: U+0033, UTF-8: 33",
                            "4 - DIGIT FOUR Unicode: U+0034, UTF-8: 34",
                            "5 - DIGIT FIVE Unicode: U+0035, UTF-8: 35",
                            "6 - DIGIT SIX Unicode: U+0036, UTF-8: 36",
                            "7 - DIGIT SEVEN Unicode: U+0037, UTF-8: 37" ];

    // it looks like listbox support is broken with CC...?
    var listbox = middleColumn.addListBox("listbox", { label: "Listbox Component", list: listboxElements, multiselect: true});
          //alert(listbox.selection = 3);
    var dropdownlist = middleColumn.addDropDownList("dropdownlist", { label: "Dropdownlist Component", list: listboxElements, height: 20 });


    // example of stored App-specific enum, which will not save properly to JSON
    var anchorPosObjArr = [ 
        AnchorPosition.TOPLEFT,  AnchorPosition.TOPCENTER, AnchorPosition.TOPRIGHT,
        AnchorPosition.MIDDLELEFT,  AnchorPosition.MIDDLECENTER, AnchorPosition.MIDDLERIGHT, 
        AnchorPosition.BOTTOMLEFT,  AnchorPosition.BOTTOMCENTER, AnchorPosition.BOTTOMRIGHT 
    ];
    var anchorPosStrArr = [ 
        "AnchorPosition.TOPLEFT",  "AnchorPosition.TOPCENTER", "AnchorPosition.TOPRIGHT",
        "AnchorPosition.MIDDLELEFT",  "AnchorPosition.MIDDLECENTER", "AnchorPosition.MIDDLERIGHT", 
        "AnchorPosition.BOTTOMLEFT",  "AnchorPosition.BOTTOMCENTER", "AnchorPosition.BOTTOMRIGHT" 
    ];
    
    // this will match a string OR object with an index from an object array (ideally without using an eval() hack)
    // expects "AnchorPosition.TOPLEFT" or any of the enum entries as a string
    // third argument is the default value, which should be fail-safe.

    // this is no longer necessary
   // JSUI.PREFS.anchorPos = JSUI.matchObjectArrayIndex(JSUI.PREFS.anchorPos, anchorPosObjArr, JSUI.anchorRef).toString();

    var anchorPosPanel = middleColumn.addPanel( { label: "Anchor Position" } );

    anchorPosPanel.addStaticText( { text:"addImageGrid radiobutton array" });
    // var anchorPos = imgButtonsGroup.addImageGrid( "anchorPos", { strArray: [ "0", "1", "2", "3", "4", "5", "6", "7", "8" ], imgFile: "Radiobutton.png", rows: 3, columns: 3 } );
    var anchorPos = anchorPosPanel.addImageGrid( "anchorPos", { strArray: anchorPosStrArr, imgFile: "Radiobutton.png", rows: 3, columns: 3 } );


    var fileSelect = folderInputOutputPanel.addBrowseForFile("fileSelect", { label: "File Selection:", characters: 45, filter: "png", helpTip: "Select PNG file" });
    var fileReplace = folderInputOutputPanel.addBrowseForFileReplace("fileReplace", { label: "Replace File:", characters: 45, filter: "txt", helpTip: "Select TXT file"  });

    //
	var winButtonsRow = win.addRow( { alignChildren:'fill', alignment: "center", margins: 15 } );

    // when running the debugger ($.level == 1), this textfield will show some of the callback results
    // it will not show at all if JSX is run directly from Photoshop ($.level == 0)
	if($.level)
	{
        debugTxt = win.addStaticText( { width:600, text:"[Debug text goes here...]\n[...and here.]", disabled:true, multiline:true, height:100 } );
        
        // when debugging, having easy access to the INI file can be useful!
        // winButtonsRow.addOpenINILocationButton( { label: "Reveal Settings"} );
        winButtonsRow.addOpenConfigLocationButton( { label: "Reveal Settings" } );

        // this button will reset JSUI.PREFS to defaults, save to JSON, then close current window and launch the entire process once more.
        winButtonsRow.addResetConfigButton( new _prefs(), true, function(){ win.close(); Main(); } );
    }

    // a close button is not technically necessary, you can just hit the Escape key
    // var close = winButtonsRow.addButton( {label:"Close", name:"cancel", width: 150, height: 44, helpTip:"Close window"} );
    // or use this prefab component...
    winButtonsRow.addCloseButton();
     
    win.center();
	win.show();
}
