/// <reference path="build/jquery" />
/// <reference path="build/require" />

/// <reference path="antigenic-map-viewer.d.ts" />

"use strict";

// ----------------------------------------------------------------------

export class Application
{
    constructor() {
    }

    public run() :void {
        require(["json!test-3d.json", "amv-level2", "css!test", "acmacs-toolkit", "acmacs-plot-data", "amv-utils"], (test_data_3d :AntigenicMapViewer.PlotDataInterface, amv :AntigenicMapViewer.MapWidgetLevel2Maker) => {
            console.log('amv-test', new Date());
            $('body').append('<div class="amv-test-widget-wrapper" />');

            var widget = amv.make_widget($('body').find('div'), null, test_data_3d);

            // $.when(widget.hover_stream()).then(function (stream) { stream.onValue(function(elts) { show_point_info('#blue > pre', test_data_3d, elts); }); });
            // $.when(widget.hover_stream()).then(function (stream) { stream.onValue(function(elts) { console.log(elts); }); });
        });
    }
}

// ----------------------------------------------------------------------
