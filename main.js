/*jshint node:true, bitwise:false */
/**
 *
 * Node Console stamp by Ståle Raknes
 *
 */

"use strict";

var defaultDateFormat = require( "dateformat" );
var merge = require( "merge" );
var chalk = require( "chalk" );
var defaults = require( "./defaults.json" );
var util = require( 'util' );

var levelPriorities = {
    log: 4,
    info: 3,
    warn: 2,
    error: 1,
    assert: 2,
    dir: 4
};

function getAllowedLogFunctions( level ) {
    var logFunctions = [],
        levelPriority = levelPriorities[level];

    for ( var logFunction in levelPriorities ) {
        if ( !levelPriorities.hasOwnProperty( logFunction ) ) {
            continue;
        }

        if ( levelPriority >= levelPriorities[logFunction] ) {
            logFunctions.push( logFunction );
        }
    }

    return logFunctions;
}

module.exports = function ( con, options, prefix_metadata ) {

    // If the console is patched already, restore it
    if ( con.__ts__ && "restoreConsole" in con ) {
        con.restoreConsole();
    }

    var pattern;

    if ( typeof options === "string" ) {
        // Fallback to version 0.1.x
        pattern = options;
        options = merge( {}, defaults );
    } else {
        options = merge( {}, defaults, (options || {}) );
        pattern = options.pattern;
        prefix_metadata = prefix_metadata || options.metadata;
    }

    var dateFormat = options.formatter || defaultDateFormat;

    options.disable = options.disable.concat( getAllowedLogFunctions( options.level ) ).filter( function filter( item, i, array ) {
        return array.indexOf( item ) === i;
    } );

    options.include = options.include.filter( function filter( m ) {
        return !~options.exclude.indexOf( m ) && !~options.disable.indexOf( m );
    } );

    //SET COLOR THEME START
    var noColor = function ( str ) {
        return str;
    }; //Default behaviour (no color)

    var getColor = function ( origColor ) {
        //If color is a chalk function already, just return it
        if ( typeof origColor === 'function' ) {
            return origColor;
        }
        //If color is an string, check if a function in chalk exists
        if ( typeof origColor === 'string' ) {
            return chalk["" + origColor] ? chalk["" + origColor] : noColor;
        }
        //If color is an array, check the contents for color strings
        if ( Array.isArray( origColor ) ) {
            if ( origColor.length > 0 ) {
                var color = chalk;
                for ( var i = 0; i < origColor.length; i++ ) {
                    if ( typeof origColor[i] === 'string' ) {
                        color = color["" + origColor[i]];
                    }
                }
                return color;
            }
            else {
                return noColor;
            }
        }
        return noColor;
    };

    var colorTheme = {};
    colorTheme.stamp = getColor( options.colors.stamp );
    colorTheme.label = getColor( options.colors.label );
    colorTheme.metadata = getColor( options.colors.metadata );
    //SET COLOR THEME END

    var original_functions = [];

    var slice = Array.prototype.slice;

    options.include.forEach( function ( f ) {

        original_functions.push( [f, con[f]] );

        var org = con[f];

        con[f] = function () {

            var prefix = colorTheme.stamp( "[" + dateFormat( pattern ) + "]" ) + " ";
            var args = slice.call( arguments );

            // Add label if flag is set
            if ( options.label ) {
                prefix += colorTheme.label( "[" + f.toUpperCase() + "]" ) + "      ".substr( f.length );
            }

            // Add metadata if any
            var metadata = "";
            if ( typeof prefix_metadata === 'function' ) {
                metadata = prefix_metadata( f, args );
            } else if ( typeof prefix_metadata === 'object' ) {
                metadata = util.inspect( prefix_metadata );
            } else if ( typeof prefix_metadata !== 'undefined' ) {
                metadata = prefix_metadata;
            }

            if ( metadata ) {
                prefix += colorTheme.metadata( metadata ) + " "; //Metadata
            }

            if ( f === "error" || f === "warn" || ( f === "assert" && !args[0] ) ) {
                process.stderr.write( prefix );
            } else if ( f !== "assert" ) {
                process.stdout.write( prefix );
            }

            return org.apply( con, args );

        };
    } );

    options.disable.forEach( function ( f ) {

        original_functions.push( [f, con[f]] );

        con[f] = function () { };

    } );

    con.restoreConsole = function () {
        original_functions.forEach( function ( pair ) {
            con[pair[0]] = pair[1];
            delete con.__ts__;
        } );
        delete con.restoreConsole;
    };

    con.__ts__ = true;

};
