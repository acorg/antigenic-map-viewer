/// <reference path="build/jquery" />
/// <reference path="build/require" />

// ----------------------------------------------------------------------

export function require_deferred(modules :string[]) :JQueryPromise<Boolean> {
    var deferred :JQueryDeferred<any[]> = $.Deferred();
    require(modules, () => {
        deferred.resolve.apply(deferred, arguments);
    });
    return deferred.promise();
}

// ----------------------------------------------------------------------
