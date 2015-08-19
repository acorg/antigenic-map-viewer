/// <reference path="build/jquery" />

/// <reference path="antigenic-map-viewer.d.ts" />

"use strict";

import AmvUtils = require("amv-utils");
import AcmacsPlotData = require("acmacs-plot-data");
import AmvLevel1 = require("amv-level1");
import AcmacsToolkit = require("acmacs-toolkit");
import AmvState = require("amv-state");

// ----------------------------------------------------------------------

export class MapWidgetLevel2 implements AntigenicMapViewer.MapWidgetLevel2, AntigenicMapViewer.TriggeringEvent
{
    public initialization_completed :JQueryDeferred<{}> = $.Deferred();

    private wrapper :JQuery;
    public map :AmvLevel1.MapWidgetLevel1;
    private user_object_label_type :string; // user_object_label_types
    private popup_hovered :AcmacsToolkit.PopupMessage;
    private help_popup :AcmacsToolkit.PopupMessage;
    private popup_menu_items_extra :AcmacsToolkit.PopupMenuDescItem[];
    private object_labels_shown :boolean;

    private static popup_hovered_message_prefix = "<ul><li>";
    private static popup_hovered_message_suffix = "</li></ul>";
    private static popup_hovered_message_infix =  "</li><li>";

    private static user_object_label_types = ["Full", "Short", "Abbreviated", "Location", "Date"];

    constructor(container :JQuery, size :number) {
        this.user_object_label_type = "full";
        this.object_labels_shown = false;
        this.wrapper = $('<div class="amv-widget-wrapper">\
                            <div class="amv-level2-title">\
                              <div class="amv-level2-title-text"></div>\
                              <table class="amv-level2-title-buttons"><tr></tr></table>\
                            </div>\
                            <div class="amv-level2-map-wrapper"></div>\
                          </div>').appendTo(container); // '<div class="amv-level2-hovered-points"></div>');
        size = this.auto_size(size);
        $.when(AmvUtils.require_deferred(["amv-level1", "helvetiker_regular.typeface"])).done(() => {
            var map_container = this.wrapper.find('.amv-level2-map-wrapper');
            map_container.css({width: size, height: size});
            if (map_container.resizable) {
                // resizable is not loaded in the printable context for unclear reason (and it is not needed there anyway)
                map_container.resizable({aspectRatio: 1.0, minWidth: 100});
                map_container.on("resize", (e :Event, ui :JQueryUI.ResizableUIParams) => this.resized(ui.size.width));
            }
            this.map = new AmvLevel1.MapWidgetLevel1(map_container, size);
            this.initialization_completed.resolve();
            this.map.bind_manipulators();
            this.map.render();
            this.map.on("hover:amv", (object_indice :number[]) => this.show_hovered(object_indice));
            this.resized(size);
            this.popup_hovered = new AcmacsToolkit.PopupMessage(map_container);
            this.help_popup = (new AcmacsToolkit.PopupMessage(this.wrapper, 'amv2-help-popup')).hide_on_click();

            // show/hide names via popup menu
            this.map.on("show-names:amv", (show :boolean) :void => { this.map.show_object_labels(show, "all"); this.object_labels_shown = show; });
            // change label type via popup menu
            this.map.on("label-type:amv", (data :any) :void => { this.user_object_label_type = data.label_type; });
            // this.map.trigger("show-names:amv", true);
        });

        // buttons
        $('<td><div class="ui-icon ui-icon-help" title="Help"></div></td>').appendTo(this.wrapper.find('.amv-level2-title-buttons tr')).on('click', (e :JQueryEventObject) => this.help(e));
        $('<td><div class="ui-icon ui-icon-grip-dotted-vertical" title="Menu"></div></td>').appendTo(this.wrapper.find('.amv-level2-title-buttons tr')).on('click', (e :JQueryEventObject) => this.popup_menu(e));
     }

    public destroy() :void {
        if (!!this.map) {
            this.map.destroy();
        }
        if (!!this.popup_hovered) {
            this.popup_hovered.destroy();
        }
        if (!!this.help_popup) {
            this.help_popup.destroy();
        }
    }

    public title(title? :string[]) :void {
        if (!!title) {
            var t = this.wrapper.find('.amv-level2-title-text').empty();
            title.map((s) => $('<p />').text(s).attr('title', s).appendTo(t));
        }
        else {
            this.wrapper.find('.amv-level2-title-text').html("");
        }
    }

    public add_popup_menu_items(items :AcmacsToolkit.PopupMenuDescItem[]) :void {
        this.popup_menu_items_extra = (this.popup_menu_items_extra || []).concat((items || []).map(function (elt) { if (!elt.eventNode) {elt = $.extend({eventNode: this}, elt); } return elt; }, this));
    }

    public on(event :string, callback: (data :any) => void) :JQuery {
        return this.wrapper.on(event, (e :Event, data :any) => callback(data));
    }

    public trigger(event :string, data :any) :void {
        this.wrapper.trigger(event, data);
    }

    private show_hovered(indice :number[]) :void {
        if (indice.length) {
            this.popup_hovered.show(MapWidgetLevel2.popup_hovered_message_prefix
                                    //+ indice.map((index :number) => this._plot_data.label_of(index, this.user_object_label_type)).join(MapWidgetLevel2.popup_hovered_message_infix)
                                    + indice.map((index :number) => this.object_label(index)).join(MapWidgetLevel2.popup_hovered_message_infix)
                                    + MapWidgetLevel2.popup_hovered_message_suffix,
                                   {left: this.wrapper.find('.amv-level2-map-wrapper').width()});
        }
        else {
            this.popup_hovered.hide();
        }
    }

    private object_label(index :number) :string {
        var user_data = this.map.objects.user_data(index);
        var r :string = '' + (index + 1);
        if (user_data && user_data.names) {
            if (user_data.names[this.user_object_label_type]) {
                r += " " + user_data.names[this.user_object_label_type];
            }
            else if (this.user_object_label_type === "location" && user_data.names.country) {
                r += " " + user_data.names.country;
                if (user_data.names.continent) {
                    r += " [" + user_data.names.continent + "]";
                }
            }
            else if (user_data.names.full) {
                r += " " + user_data.names.full;
            }
        }
        return r
    }

    private resized(size :number) :void {
        this.map.size(size);
        this.wrapper.find('.amv-level2-title-text').css({maxWidth: size - this.wrapper.find('.amv-level2-title-buttons').width()});
    }

    private popup_menu(e :JQueryEventObject) :void {
        var menu = new AcmacsToolkit.PopupMenu({items: this.popup_menu_items()});
        menu.show($(e.currentTarget));
    }

    private popup_menu_items() :AcmacsToolkit.PopupMenuDescItem[] {
        var label_menu :AcmacsToolkit.PopupMenuDescItem[] = MapWidgetLevel2.user_object_label_types.map((lt :string) => ({
            label: lt, icon: lt.toLowerCase() === this.user_object_label_type ? "ui-icon-check" : null, event: "label-type:amv", eventNode: this.map, eventData: {label_type: lt.toLowerCase()}})) || [];
        var m :AcmacsToolkit.PopupMenuDescItem[] = [
            {label: "Reset", event: "reset:amv", eventNode: this.map},
            {label: this.object_labels_shown ? "Hide names" : "Show names", event: "show-names:amv", eventNode: this.map, eventData: !this.object_labels_shown},
        ];
        return m.concat(this.popup_menu_items_extra || [], [{}, {label: "Label type", title: true}], label_menu);
    }

    private help(e :JQueryEventObject) :void {
        this.help_popup.show(this.map.help_text())
    }

    private auto_size(size :number) :number {
        console.log('auto_size', $(window).width(), $(window).height());
        if (!size) {
            var widget_offset = this.wrapper.offset(), map_offset = this.wrapper.find('.amv-level2-map-wrapper').offset();
            var field_size = Math.min($(window).width() - map_offset.left * 2, $(window).height() - (widget_offset.top > 300 /* not the first map on page? */ ? 150 : widget_offset.top + map_offset.top));
            // console.log('window', $(window).width(), $(window).height(), 'widget offset', widget_offset.left, widget_offset.top, 'position', this.wrapper.position().left, this.wrapper.position().top);
            // console.log('map wrapper', map_offset.left, map_offset.top);
            size = field_size;
        }
        // console.log('auto_size size', size);
        return size;
    }
}

// ----------------------------------------------------------------------

export function make_widget(container :JQuery, size :number, plot_data :AntigenicMapViewer.PlotDataInterface|AntigenicMapViewer.MapStateForDrawing, extra_popup_menu_items? :AcmacsToolkit.PopupMenuDescItem[]) :MapWidgetLevel2
{
    var widget = new MapWidgetLevel2(container, size);
    $.when(widget.initialization_completed).done(function() {
        if ((<AntigenicMapViewer.PlotDataInterface>plot_data).layout) {
            var pd = new AcmacsPlotData.PlotData(<AntigenicMapViewer.PlotDataInterface>plot_data);
            widget.title(pd.title());
            // widget.user_object_label_type = pd.default_label_type();
            pd.setup_map(widget.map);
        }
        else if ((<AntigenicMapViewer.MapStateForDrawing>plot_data).camera_looking_at) {
            widget_restore(widget, <AntigenicMapViewer.MapStateForDrawing>plot_data);
        }
        else {
            console.error('internal in make_widget');
        }

        if (extra_popup_menu_items) {
            widget.add_popup_menu_items(extra_popup_menu_items);
        }
    });

    return widget;
}

// ----------------------------------------------------------------------

export function widget_state(widget :MapWidgetLevel2|AmvLevel1.MapWidgetLevel1) :AntigenicMapViewer.MapStateForDrawing
{
    var w :AmvLevel1.MapWidgetLevel1 = (widget instanceof MapWidgetLevel2) ? (<MapWidgetLevel2>widget).map : <AmvLevel1.MapWidgetLevel1>widget;
    return AmvState.widget_state(w);
}

// ----------------------------------------------------------------------

export function widget_restore(widget :MapWidgetLevel2|AmvLevel1.MapWidgetLevel1, state :AntigenicMapViewer.MapStateForDrawing) :void
{
    var w :AmvLevel1.MapWidgetLevel1 = (widget instanceof MapWidgetLevel2) ? (<MapWidgetLevel2>widget).map : <AmvLevel1.MapWidgetLevel1>widget;
    AmvState.widget_restore(w, state);
}

// ----------------------------------------------------------------------
