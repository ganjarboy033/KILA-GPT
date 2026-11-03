package com.mori.downloader;

import androidx.core.content.FileProvider;

/**
 * Subclass supaya manifest KILA tidak bentrok dengan FileProvider lain (satu nama class = satu entri).
 * Authority: ${applicationId}.mori.fileprovider
 */
public class MoriFileProvider extends FileProvider {}
