/*
 * Worksets extension for Gnome 3
 * This file is part of the worksets extension for Gnome 3
 * Copyright (C) 2019 A.D. - http://blipk.xyz
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope this it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * 
 * Credits:
 * This extension was created by using the following gnome-shell extensions
 * as a source for code and/or a learning resource
 * - dash-to-panel@jderose9.github.com.v16.shell-extension
 * - clipboard-indicator@tudmotu.com
 * - workspaces-to-dock@passingthru67.gmail.com
 * - workspace-isolated-dash@n-yuki.v14.shell-extension
 * - historymanager-prefix-search@sustmidown.centrum.cz
 * - minimum-workspaces@philbot9.github.com.v9.shell-extension
 * 
 * Many thanks to those great extensions.
 */

//External imports
const Lang = imports.lang;
const AppFavorites = imports.ui.appFavorites;
const Main = imports.ui.main;

//Internal imports
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const utils = Me.imports.utils;
const fileUtils = Me.imports.fileUtils;
const uiUtils = Me.imports.uiUtils;
const panelIndicator = Me.imports.panelIndicator;
const workspaceManager = Me.imports.workspaceManager;
const workspaceIsolater = Me.imports.workspaceIsolater;
const dev = Me.imports.devUtils;
const scopeName = "sessionmanager";

var sessionManager = new Lang.Class({
    Name: 'Worksets.sessionManager',
    
    collections: null,
    activeCollectionIndex: 0,
    favoritesChangeHandler: null,

    _init: function() {
        try {
        Me.session = this;

        //Create sesion or initialize from session file if it exists
        if (fileUtils.checkExists(fileUtils.CONF_DIR + '/session.json')) {
            let obj = fileUtils.loadJSObjectFromFile('session.json', fileUtils.CONF_DIR);
            this._setup(obj);
        } else {
            this.newSession(true);
            this._setup(this.collections);
        }
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    _setup: function(sessionObject) {
        try {
        if (!utils.isEmpty(sessionObject)) {
            this.collections = sessionObject;
            this._cleanWorksets();

            this.favoritesChangeHandler = AppFavorites.getAppFavorites().connect('changed', Lang.bind(this, this._favoritesChanged))
            Me.workspaceManager = new workspaceManager.WorkspaceManager();

            Me.worksetsIndicator = new panelIndicator.WorksetsIndicator();
            Main.panel.addToStatusArea('WorksetsIndicator', Me.worksetsIndicator, 1);

            this.saveSession();
        }
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    _cleanWorksets: function() {
        try {
        
        this.collections.forEach(function(collectionBuffer, i) {
            if (typeof collectionBuffer.CollectionName !== 'string') collectionBuffer.CollectionName = "Collection " + i;
            if (typeof collectionBuffer.Favorite !== 'boolean') collectionBuffer.Favorite = false;

            // Remove invalid entries
            let filteredWorksets;
            //filteredWorksets = this.collections[i].Worksets.filter(item => (Array.isArray(item.FavApps)));
            //filteredWorksets = filteredWorksets.filter(item => (!isNaN(item.DefaultWorkspaceIndex)));
            //filteredWorksets = filteredWorksets.filter(item => (!isNaN(item.activeWorkspaceIndex)));
            //filteredWorksets = filteredWorksets.filter(item => ((typeof item.Favorite === 'boolean')));
            //filteredWorksets = filteredWorksets.filter(item => ((typeof item.active === 'boolean')));
            //this.collections[i].Worksets = filteredWorksets;

            this.collections[i].Worksets.forEach(function (worksetBuffer, ii) {
                //Fix entries
                worksetBuffer.active = false;
                worksetBuffer.activeWorkspaceIndex = null;
                if (!Array.isArray(worksetBuffer.FavApps)) worksetBuffer.FavApps = [];
                if (isNaN(worksetBuffer.DefaultWorkspaceIndex)) worksetBuffer.DefaultWorkspaceIndex = -1;
                if (typeof worksetBuffer.WorksetName !== 'string') worksetBuffer.WorksetName = "Workset " + ii;
                if (typeof worksetBuffer.Favorite !== 'boolean') worksetBuffer.Favorite = false;

                // Remove duplicate entries
                filteredWorksets = collectionBuffer.Worksets.filter(function(item) {                    
                    if (item !== worksetBuffer &&
                        (JSON.stringify(item) === JSON.stringify(worksetBuffer)))
                        { return false; }
                    return true;
                }, this);
            }, this);

            // Apply
            this.collections[i].Worksets = filteredWorksets;
        }, this);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    destroy: function() {
        try {
        this.saveSession();
        if (this.favoritesChangeHandler) {AppFavorites.getAppFavorites().disconnect(this.favoritesChangeHandler)};
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    setFavorites: function(favArray) {
        try {
        global.settings.set_strv("favorite-apps", favArray);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    getFavorites: function(favArray) {
        try {
        return global.settings.get_strv("favorite-apps");
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    _favoritesChanged: function() {
        try {
        this.collections.forEach(function (collectionsbuffer, collectionIndex) {
            this.collections[collectionIndex].Worksets.forEach(function (worksetBuffer, worksetIndex) {
                if(worksetBuffer.activeWorkspaceIndex === Me.workspaceManager.activeWorkspaceIndex) {
                    this.collections[collectionIndex].Worksets[worksetIndex].FavApps = this.getFavorites(); 
                }
            }, this);
        }, this);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    displayWorkset: function(workset, loadInNewWorkspace=false) {
        try {
        if (workset.active) { //switch to it if already active
            Me.workspaceManager.switchToWorkspace(workset.activeWorkspaceIndex);
            this.setFavorites(workset.FavApps);
        } else {
            //Set up our new workset
            workset.active = true;
            if (loadInNewWorkspace) { //create and open new workspace before loading workset
                Me.workspaceManager.workspaceUpdate();
                Me.workspaceManager.switchToWorkspace(Me.workspaceManager.NumGlobalWorkspaces-1); 
            }
            workset.activeWorkspaceIndex = Me.workspaceManager.activeWorkspaceIndex;

            //Remove active flag from any worksets that where previously here
            this.collections.forEach(function (collectionsbuffer, collectionIndex) {
                this.collections[collectionIndex].Worksets.forEach(function (worksetBuffer, worksetIndex) {
                    if((worksetBuffer !== workset) && (worksetBuffer.activeWorkspaceIndex === Me.workspaceManager.activeWorkspaceIndex)) {
                        this.collections[collectionIndex].Worksets[worksetIndex].active = false; 
                        this.collections[collectionIndex].Worksets[worksetIndex].activeWorkspaceIndex = null;
                    }
                }, this);
            }, this);
    
            //Apply workset changes to workspace
            this.setFavorites(workset.FavApps);

            uiUtils.showUserFeedbackMessage("Loaded workset " + workset.WorksetName, true);
        }
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },

    //Collection Navigation
    activateCollection: function(index) {
        try {
        this.activeCollectionIndex = index;
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    }, 
    nextCollection: function() {
        if(!utils.isEmpty(this.collections[(this.activeCollectionIndex+1)])) {
            this.activateCollection(this.activeCollectionIndex+1);
            uiUtils.showUserFeedbackMessage("Next collection...");
        }
    },
    prevCollection: function() {
        if(!utils.isEmpty(this.collections[(this.activeCollectionIndex-1)])) {
            this.activateCollection(this.activeCollectionIndex-1);
            uiUtils.showUserFeedbackMessage("Previous collection...");
        }
    },

    //Collection and Workset Management
    newSession: function(fromEnvironment=false, backup=false) {
        try {
        if (backup) this.saveSession(true);

        //Create new session object from protoype in gschema
        let sessionObject = JSON.parse(Me.settings.get_string("session-prototype-json"));
        
        if (fromEnvironment) {
            //Build on prototype from current environment, blank prototype collection+workset add all current FavApps to Primary workset 
            let currentFavoriteApplications = this.getFavorites();
            sessionObject[0].CollectionName = "Default";
            sessionObject[0].Favorite = true;
            sessionObject[0].Worksets[0].DefaultWorkspaceIndex = 0;
            sessionObject[0].Worksets[0].FavApps = currentFavoriteApplications;
            sessionObject[0].Worksets[0].WorksetName = "Primary Workset";
            sessionObject[0].Worksets[0].Favorite = true;
            sessionObject[0].Worksets[0].active = true;
            sessionObject[0].Worksets[0].activeWorkspaceIndex = 0;
        } else {
            sessionObject[0].CollectionName = "Default";
            sessionObject[0].Worksets[0].WorksetName = "New Workset";
        }
        //Load the session
        this.loadSession(sessionObject);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    newObject: function(){
        try {
        let options =  [[{option: "New workset in current collection", value: 0}],
                        [{option: "New collection with new workset", value: 1}],
                        [{option: "New session", value: 2}]];

        let getNewOptionDialog = new uiUtils.ObjectInterfaceDialog("What would you like to create?", (returnOption) => {
                switch(returnOption.value) {
                    case 0: this.newWorkset(); break;
                    case 1: this.newCollection(); break;
                    case 2: this.newSession(true, true); break;
                    default:
                }
        }, false, true, options, [{option: ' '}]);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    newCollection: function(name) {
        try { 
        //Create new collection from protoype
        let collectionObject = JSON.parse(Me.settings.get_string("collection-prototype-json"));
        collectionObject.Worksets = [];
        //Build on prototype
        if (!name) {
            let getNewCollectionNameDialog = new uiUtils.ObjectInterfaceDialog("Please enter name for new collection.", (returnText) => {
                collectionObject.CollectionName = returnText;
                this.newWorkset(); //Add a workset to the new collection
            });
        } else {
            collectionObject.CollectionName = name;
        }

        //Push it to into this.collections and set it to current
        this.collections.push(collectionObject);
        this.activeCollectionIndex = this.collections.length-1;
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    newWorkset: function(name, targetCollectionIndex, fromEnvironment=true, newCollection=false) {
        try {
        if (newCollection) {this.newCollection(); return;} //this will create a new collection which in turn will return here to create the new workset

        //Create new workset object from protoype in gschema
        let worksetObject = JSON.parse(Me.settings.get_string("workset-prototype-json"));
        let currentFavoriteApplications = this.getFavorites();
        let currentRunningApplications = Me.workspaceManager.getWorkspaceAppIds();

        if (fromEnvironment) {
            //Build on prototype from current environment, add all current FavApps+RunningApps to it
            worksetObject.FavApps = currentFavoriteApplications.concat(currentRunningApplications);
            worksetObject.Favorite = true;
        } else {
            //Blank prototype with no FavApps
            worksetObject.FavApps = [];
            worksetObject.Favorite = false;
        }

        if (!name) {
            let getNewWorksetNameDialog = new uiUtils.ObjectInterfaceDialog("Please enter name for new workset.", (returnText) => {
                worksetObject.WorksetName = returnText;
                uiUtils.showUserFeedbackMessage("Workset "+returnText+" created.");
            });
        } else {
            worksetObject.WorksetName = name;
        }
        
        //Push it to current/target collection
        (targetCollectionIndex === undefined) ? targetCollectionIndex = this.activeCollectionIndex : targetCollectionIndex = targetCollectionIndex;
        this.collections[targetCollectionIndex].Worksets.push(worksetObject);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    
    //Storage management
    showObjectManager: function() {
        try {
        if (utils.isEmpty(this.collections)) return;

        let worksetObjects = [];
        this.collections.forEach(function (collectionBuffer, collectionIndex) {
            collectionBuffer.Worksets.forEach(function (worksetBuffer, worksetIndex) {
                worksetObjects.push(this.collections[collectionIndex].Worksets[worksetIndex]);
            }, this);
        }, this);
        
        let editObjectChooseDialog = new uiUtils.ObjectInterfaceDialog("Please select a collection or workset to edit.", (returnObject) => {
            let editObjectChooseDialog = new uiUtils.ObjectEditorDialog("Properties of the object.", () => {
                    uiUtils.showUserFeedbackMessage("Changes have been saved.");
            }, returnObject, [{WorksetName: 'Workset Name'}, {DefaultWorkspaceIndex: 'Load on workspace X by default'}, {Favorite: 'Favorite'}, {CollectionName: 'Collection Name'}]);

        }, false, true, [this.collections, worksetObjects], [{CollectionName: 'Collections'},{WorksetName: 'Worksets'}]);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    loadObject: function() {
        try {
        let collectionsDirectory = fileUtils.CONF_DIR + '/collections';
        let worksetsDirectory = fileUtils.CONF_DIR + '/worksets';
        let loadObjectDialog = new uiUtils.ObjectInterfaceDialog("Please select a previously saved collection or workset to load from disk.", (returnObject) => {
            if (returnObject.CollectionName) {
                this.collections.push(returnObject);
                this.activeCollectionIndex = (this.collections.length-1);
                uiUtils.showUserFeedbackMessage("Collection loaded from file and added to current session.");
            } else if (returnObject.WorksetName) {
                this.collections[this.activeCollectionIndex].Worksets.push(returnObject);
                uiUtils.showUserFeedbackMessage("Workset loaded from file and added to active collection.");  
            }
            
        }, false, true, [collectionsDirectory, worksetsDirectory], [{CollectionName: 'Collections'},{WorksetName: 'Worksets'}]);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    loadSession: function(sessionsObject, restore=false) {
        try {
        if (!sessionsObject) {
            let filename = (restore ? 'session-backup.json' : 'session.json');
            sessionObject = fileUtils.loadJSObjectFromFile(filename, fileUtils.CONF_DIR);
            if (!utils.isEmpty(sessionObject) /*&& utils.isEmpty(this.collections)*/) {
                this.activeCollectionIndex = 0;
                this.collections = sessionsObject;
            }
        } else {
            this.activeCollectionIndex = 0;
            this.collections = sessionsObject;
        }
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    saveSession: function(backup=false) {
        try {
        if (utils.isEmpty(this.collections)) return;

        let sessionCopy = JSON.parse(JSON.stringify(this.collections));
        sessionCopy.forEach(function (collectionBuffer, collectionIndex) {
            sessionCopy[collectionIndex].Worksets.forEach(function (worksetBuffer, i) {
                sessionCopy[collectionIndex].Worksets[i].active = false;
                sessionCopy[collectionIndex].Worksets[i].activeWorkspaceIndex = null;
            }, this);
        }, this);

        let timestamp = new Date().toLocaleString().replace(/[^a-zA-Z0-9-. ]/g, '').replace(/ /g, '');
        let filename = (backup ? 'session-backup-'+timestamp+'.json' : 'session.json');
        fileUtils.saveJSObjectToFile(sessionCopy, filename, fileUtils.CONF_DIR);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    saveCollection: function(collectionIndex) {
        try {
        this.collections[collectionIndex].Worksets.forEach(function (worksetBuffer, i) {
            this.collections[collectionIndex].Worksets[i].active = false;
            this.collections[collectionIndex].Worksets[i].activeWorkspaceIndex = null;
        }, this);
        let filename = 'collection-'+this.collections[collectionIndex].CollectionName+'.json'
        fileUtils.saveJSObjectToFile(this.collections[collectionIndex], filename, fileUtils.CONF_DIR+'/collections');
        uiUtils.showUserFeedbackMessage("Collection saved as "+filename);
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    },
    saveActiveCollection: function() {
        this.saveCollection(this.activeCollectionIndex);
    },
    saveWorkset: function(workset, backup=false) {
        try {
        if (utils.isEmpty(workset)) return;

        workset.active = false;
        workset.activeWorkspaceIndex = null;

        let timestamp = new Date().toLocaleString().replace(/[^a-zA-Z0-9-. ]/g, '').replace(/ /g, '');
        let filename = (backup ? 'workset-'+workset.WorksetName+'-'+timestamp+'.json' : 'workset-'+workset.WorksetName+'.json');

        fileUtils.saveJSObjectToFile(workset, filename, fileUtils.CONF_DIR+'/worksets');
        if (!backup) uiUtils.showUserFeedbackMessage("Workset saved to "+filename);

        return filename;
        } catch(e) { dev.log(scopeName+'.'+arguments.callee.name, e); }
    }
});
