# -*- Makefile -*-
# Eugene Skepner 2015
# ----------------------------------------------------------------------

MAKEFLAGS = -w

# override in command line
ifneq ($(findstring install,$(MAKECMDGOALS)),)
ifeq ($(ANTIGENIC_MAP_VIEWER_INSTALL),)
  $(error ANTIGENIC_MAP_VIEWER_INSTALL not set)
endif
endif

# ----------------------------------------------------------------------

AMV_TEST = amv-config.js test-3d.ts test.less test-3d.json test-2d.ts test-3d.html test-2d.html
AMV_LIB = acmacs-plot-data.ts amv-level1.ts amv-level2.ts \
	  amv-manipulator.ts amv-manipulator-2d.ts amv-manipulator-3d.ts amv-2d.ts amv-3d.ts \
	  amv-utils.ts acmacs-toolkit.ts amv-state.ts
AMV_LESS = acmacs-toolkit.less amv.less
AMV_TYPINGS = antigenic-map-viewer.d.ts
AMV_FONTS = fonts/helvetiker_regular.typeface.js fonts/helvetiker_bold.typeface.js

LIB_JS = jquery jquery-ui three.js require.js

AMV = $(AMV_LIB) $(AMV_TEST)

# ----------------------------------------------------------------------

TARGET_JS = $(TS_TO_JS) $(patsubst %.js,$(DIST)/%.js,$(filter %.js,$(AMV))) $(patsubst %.json,$(DIST)/%.json,$(filter %.json,$(AMV))) $(patsubst fonts/%.js,$(DIST)/%.js,$(AMV_FONTS))
  # $(patsubst %,$(DIST)/%.js,$(LIB_JS))
TARGET_CSS = $(patsubst %.less,$(DIST)/%.css,$(filter %.less,$(AMV)))
TARGET_HTML = $(patsubst %,$(DIST)/%,$(filter %.html,$(AMV)))

# BUILD_TYPINGS = $(patsubst %,$(BUILD)/%.d.ts,$(LIB_TYPINGS)) $(AMV_TYPINGS)

# ----------------------------------------------------------------------

TS_TO_JS = $(patsubst %.ts,$(DIST)/%.js,$(filter %.ts,$(AMV)))

INSTALL_FILES = $(patsubst %.ts,$(DIST)/%.js,$(filter %.ts,$(AMV_LIB))) \
		$(AMV_LESS) $(patsubst fonts/%.js,$(DIST)/%.js,$(AMV_FONTS))

VERSION = $(shell cat VERSION.txt)
PKG_CONFIG_PATH = $(firstword $(subst :, ,$(shell pkg-config --variable pc_path pkg-config)))

# ----------------------------------------------------------------------

BUILD = build
DIST = dist

all: $(TARGET_JS) $(TARGET_CSS) $(TARGET_HTML)
	@#echo 'rebuilt  ' $?
	@#echo 'all      ' $^
	@#echo 'TARGET_JS' $(TARGET_JS)

# ----------------------------------------------------------------------

EUPA_MAKEFILE ?= eupa/Makefile.eupa
EUPA_DIST ?= dist
EUPA_BUILD ?= build

ifeq ($(findstring clean,$(MAKECMDGOALS)),)
ifeq ($(wildcard $(EUPA_MAKEFILE)),)
  $(shell git clone https://github.com/skepner/eupa.git)
endif
include $(EUPA_MAKEFILE)
endif

TYPINGS_DIR = $(EUPA_BUILD)

# ----------------------------------------------------------------------

test: all
ifeq ($(shell uname -s),Darwin)
	open $(TARGET_HTML)
endif

install: all
	/usr/bin/install -d -m 0755 $(ANTIGENIC_MAP_VIEWER_INSTALL)
	/usr/bin/install -vC -m 0644 $(INSTALL_FILES) $(AMV_TYPINGS) $(ANTIGENIC_MAP_VIEWER_INSTALL)

clean:
	rm -rf $(DIST)

distclean: clean
	rm -rf $(BUILD) eupa

# ----------------------------------------------------------------------

RELPATH = $(shell python -c "import os, sys; sys.stdout.write(os.path.relpath('${1}', '${2}'))")

# ----------------------------------------------------------------------

$(BUILD)/typings-references.ts: typings-references.ts.in | $(BUILD)
	sed 's/{TYPINGS-DIR}/$(subst /,\/,$(TYPINGS_DIR))/g' $< >$@

$(DIST)/%.js: %.ts $(BUILD)/typings-references.ts | $(TSC) $(DIST) $(LIB_JS)
	$(TSC_RUN) --outDir $(DIST) $<

$(DIST)/%.js: %.js | $(DIST)
	ln -s $(call RELPATH,$(dir $^),$(dir $@))/$^ $@

$(DIST)/%.js: %.js.in | $(DIST)
	sed 's/{REQUIRE-JQUERY-PATH}/./' $^ >$@

$(DIST)/%.js: fonts/%.js | $(DIST)
	ln -s $(call RELPATH,$(dir $^),$(dir $@))/$(notdir $^) $@

$(DIST)/%.json: %.json | $(DIST)
	ln -s $(call RELPATH,$(dir $^),$(dir $@))/$^ $@

$(DIST)/%.css: %.less $(AMV_LESS) | $(DIST) $(LESSC)
	$(LESSC) $< $@

# Have to copy html to dist, Firefox does not like symbolic links
$(DIST)/%.html: %.html | $(DIST)
	cp $^ $@

# ----------------------------------------------------------------------

$(DIST):
	$(call make_target_dir,$(DIST),DIST)

$(BUILD):
	$(call make_target_dir,$(BUILD),BUILD)
