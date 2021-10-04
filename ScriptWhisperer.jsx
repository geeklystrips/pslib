/*

    ScriptWhisperer.jsx

    Sources: xbytor xtools

    ----
    Get ScriptingListener plugin from Adobe website:

    https://helpx.adobe.com/photoshop/kb/downloadable-plugins-and-content.html

    Windows
    https://download.adobe.com/pub/adobe/photoshop/win/13.x/Win_Scripting_Plug-In.zip

    macOS
    2020+: https://helpx.adobe.com/content/dam/help/en/photoshop/kb/downloadable-plugins-and-content/Scripting_Plug_In_Release.zip

    2019 and earlier: https://download.adobe.com/pub/adobe/photoshop/mac/13.x/Scripting_Plug_In_Release.dmg


        macOS 10.14+ issue with downloaded plugins: 
        .plugin packages are technically applications considered a security risk because they are downloaded from the Web.

        The following fix is adapted from https://community.adobe.com/t5/indesign-discussions/plugin-error-with-mac-os-catalina/m-p/10660103

        ----

        Quit Photoshop if running.
        
        Move the plugin from out its place, e.g. to the Desktop.
        
        Start Photoshop again, so that it considers/registers the change.
        
        Quit Photoshop.
        
        Move the plugin back.
        
        Unquarantine the plugin with the xattr command in terminal:

            - Launch terminal
            - type "sudo xattr -r -d com.apple.quarantine " without the quotes and without return, but including the final space
            - Instead of typing the path, drag the plugin file to the terminal.

              The result should read:
              sudo xattr -r -d com.apple.quarantine /Applications/Adobe\ Photoshop\ 2021/Plug-ins/ScriptingListener.plugin

            - press return to run the command (terminal may ask for an admin password)
            - When completed, start Photoshop.

        -----
*/

#target photoshop;

#include "jsui.js";

function toggleListener( bool )
{
    try
    {
        var d = new ActionDescriptor;
        d.putBoolean(charIDToTypeID('Log '), bool);
        executeAction(stringIDToTypeID("AdobeScriptListener ScriptListener"), d, DialogModes.NO);
    }
    catch(e)
    {   
        showWarning();
    }
};

function getListenerValue()
{
   // r = new ActionReference();
    // r.putEnumerated (stringIDToTypeID ("layer"), stringIDToTypeID ("ordinal"), stringIDToTypeID ("targetEnum"));
    // d = executeActionGet (r) .getBoolean (stringIDToTypeID ('artboardEnabled'));

    // r.putEnumerated (stringIDToTypeID ("layer"), stringIDToTypeID ("ordinal"), stringIDToTypeID ("targetEnum"));
    // d = executeActionGet (r) .getBoolean (stringIDToTypeID ('artboardEnabled'));

    // --
    var listenerID = stringIDToTypeID("AdobeScriptListener ScriptListener");
    var keyLogID = charIDToTypeID('Log ');
    var d = new ActionDescriptor;
    d.getBoolean(keyLogID); //, true);
    return executeAction(listenerID, d, DialogModes.NO);
}

function activateListener()
{
    toggleListener(true);
};

function deactivateListener()
{
    toggleListener(false);
};

function showSLinfo()
{
    var msg = "";

    try
    {
        var isWindows = $.os.match(/windows/i) == "Windows";
        var pluginsURI = new Folder( app.path + "/" + localize("$$$/private/Plugins/DefaultPluginFolder=Plug-Ins") ) ;
        var pluginName = isWindows ? "ScriptListener.8li" : "ScriptingListener.plugin" ;
        var pluginFile = ( isWindows ? new Folder ( pluginsURI + "/" + pluginName ) : new File ( pluginsURI + "/" + pluginName ) );

        msg += "ScriptingListener plugin:\n\n" + pluginFile.fsName + "\n\nExists: " + pluginFile.exists;
    }
    catch(e)
    {
        msg += ( e + "\n\nError accessing ScriptListener plugin.\n\n" );
        msg += (pluginFile.fsName + ( pluginFile.exists ? "\nPlugin file present. Restart Photoshop. " : "\nPlugin file not found" ));
        if($.level) $.writeln(msg);
        else ( JSUI.alert(msg) );

        //alert(e);
    }
    if(msg.length) 
    {
        // JSUI.alert(msg);
        JSUI.showInfo( msg, "https://helpx.adobe.com/photoshop/kb/downloadable-plugins-and-content.html" );
    }

};

function Main()
{
     showSLinfo();

  // activateListener();
//    alert( getListenerValue() );
    
//deactivateListener();

};

Main();