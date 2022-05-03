/*
    TestJSONConfig.jsx

    - loads values from local JSON file
    - provides default values if JSON not found or invalid

*/

// #target photoshop;
#target illustrator;

#include "../JSUI.js";

Main();

function Main()
{

    JSUI.TOOLNAME = "Test JSUI JSON Config";
    JSUI.populateJSON(); // turns autosave ON
    
    function _settings()
    {
        this.projectTitleStr = "Untitled";
        this.projectWorkingTitleStr = "Untitled";
        this.editorNameStr = "Unreal";
        this.editorVersionNum = 5.01;

        this.textureMathLogicStr = "mult4";

        this.textureInvalidHex = "FF0000";
        this.textureMult4Hex = "FF8000";
        this.textureMult8Hex = "FFFF00";
        this.textureMult16Hex ="00FF00";
        this.textureMult32Hex = "00FFFF";
        this.texturePow2Hex =  "0000FF";

        return this;
    }

    JSUI.PREFS = JSUI.readJSONfile( new _settings(), JSUI.JSONFILE );
    JSUI.saveIniFile();

};