/// <reference path="build/jquery" />

/// <reference path="antigenic-map-viewer.d.ts" />

"use strict";

import AmvUtils = require("amv-utils");
import AcmacsPlotData = require("acmacs-plot-data");
import AmvLevel1 = require("amv-level1");
import AcmacsToolkit = require("acmacs-toolkit");

// ----------------------------------------------------------------------

export class MapWidgetLevel2 implements AntigenicMapViewer.MapWidgetLevel2
{
    private map :AmvLevel1.MapWidgetLevel1;
    private map_created :JQueryDeferred<{}>;
    private _plot_data :AcmacsPlotData.PlotData;
    private user_object_label_type :string;
    private popup_hovered :AcmacsToolkit.PopupMessage;

    private static popup_hovered_message_prefix = "<ul><li>";
    private static popup_hovered_message_suffix = "</li></ul>";
    private static popup_hovered_message_infix =  "</li><li>";

    constructor(private container :JQuery, size :number) {
        this.map_created = $.Deferred();
        container.append('<div class="amv-level2-title"><span class="amv-level2-title-text"></span><div class="amv-level2-title-menu-button"></div></div>'
                         + '<div class="amv-level2-map-wrapper"></div>'); // '<div class="amv-level2-hovered-points"></div>');
        $.when(AmvUtils.require_deferred(['amv-level1'])).done(() => {
            var map_container = container.find('.amv-level2-map-wrapper');
            map_container.css({width: size, height: size});
            map_container.resizable({aspectRatio: 1.0, minWidth: 100});
            map_container.on("resize", (e :Event, ui :JQueryUI.ResizableUIParams) => this.resized(ui.size.width));
            this.map = new AmvLevel1.MapWidgetLevel1(map_container, size);
            this.map_created.resolve();
            this.map.bind_manipulators();
            this.map.render();
            this.map.on("hover:amv", (object_indice :number[]) => this.show_hovered(object_indice));
            this.resized(size);
            this.popup_hovered = new AcmacsToolkit.PopupMessage(map_container);

            // change label type via popup menu
            this.map.on("label-type:amv", (data :any) :void => { this.user_object_label_type = data.label_type || this._plot_data.default_label_type(); });
        });

        // menu button
        this.container.find('.amv-level2-title-menu-button').append('<div class="ui-icon ui-icon-grip-dotted-vertical"></div>').on('click', (e :JQueryEventObject) => this.popup_menu(e));

        this.title('' + new Date());
     }

    public destroy() :void {
        if (!!this.map) {
            this.map.destroy();
        }
        if (!!this.popup_hovered) {
            this.popup_hovered.destroy();
        }
    }

    public title(title? :string) :void {
        this.container.find('.amv-level2-title-text').text(title || "");
    }

    public plot_data(plot_data :AntigenicMapViewer.PlotDataInterface) :void {
        this._plot_data = new AcmacsPlotData.PlotData(plot_data);
        this.user_object_label_type = this._plot_data.default_label_type();
        $.when(this.map_created).done(() => {
            this.map.user_objects(this._plot_data);
        });
    }

    private show_hovered(indice :number[]) :void {
        if (indice.length) {
            this.popup_hovered.show(MapWidgetLevel2.popup_hovered_message_prefix
                                    + indice.map((index :number) => this._plot_data.label_of(index, this.user_object_label_type)).join(MapWidgetLevel2.popup_hovered_message_infix)
                                    + MapWidgetLevel2.popup_hovered_message_suffix);
        }
        else {
            this.popup_hovered.hide();
        }
    }

    private resized(size :number) :void {
        //this.container.find('.amv-level2-title').css({width: size});
        this.map.size(size);
        this.container.find('.amv-level2-title-text').css({maxWidth: size - 10});
    }

    private popup_menu(e :JQueryEventObject) :void {
        var label_menu = this._plot_data.label_types().map((lt :string) => ({
            label: lt, icon: lt === this.user_object_label_type ? "ui-icon-check" : null, event: "label-type:amv", eventNode: this.map, eventData: {label_type: lt}}));
        var menu = new AcmacsToolkit.PopupMenu({
            items: [{label: "Reset", event: "reset:amv", eventNode: this.map},
                    {},
                    {label: "Label type", title: true}
                   ].concat(label_menu)
        });
        menu.show($(e.currentTarget));
    }

}

// ----------------------------------------------------------------------

export function make_widget(container :JQuery, size :number, plot_data :AntigenicMapViewer.PlotDataInterface) :MapWidgetLevel2
    {
        if (size === null || size === undefined) {
            size = 500;
        }
        var widget = new MapWidgetLevel2(container, size);
        widget.plot_data(plot_data);
        return widget;
    }

// ----------------------------------------------------------------------
