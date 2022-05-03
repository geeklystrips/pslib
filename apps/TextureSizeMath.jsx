/*

    TextureSizeMath.jsx

    Testing number values for compatibility with game-dev textures



*/

#target photoshop;
#include "../JSUI.js";

Main();

function Main()
{
    var num = -128;
    $.writeln( "Number: " + num );

    var isPow2 = JSUI.isPower2(num);
    $.writeln( "is power of 2: " + isPow2 );

    var isMult4 = JSUI.isMult(num, 4);
    $.writeln( "is multiple of 4: " + isMult4);

    var isMult8 = JSUI.isMult(num, 8);
    $.writeln( "is multiple of 8: " + isMult8);

    var isMult16 = JSUI.isMult(num, 16);
    $.writeln( "is multiple of 16: " + isMult16);

    var isMult32 = JSUI.isMult(num, 32);
    $.writeln( "is multiple of 32: " + isMult32);
};