package io.ymusic.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.ymusic.settings.AppSettings
import io.ymusic.settings.flow
import io.ymusic.settings.put
import io.ymusic.ui.resources.Res
import io.ymusic.ui.resources.settings_tabs_hint
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.stringResource

/**
 * KILA: Settings → Tabs. One checkbox per hideable drawer tab; ticked = shown. Persisted at once
 * (AppSettings.hideTab) and the drawer reads the same flows, so the change is live.
 */
@Composable
internal fun TabVisibilityRows(graph: AppGraph) {
    Column {
        Text(
            stringResource(Res.string.settings_tabs_hint),
            style = TextStyle(fontSize = 12.sp, color = DesignColors.InkSecondary),
            modifier = Modifier.padding(
                horizontal = DesignSpacing.SettingsRowHorizontal,
                vertical = DesignSpacing.SettingsRowVertical,
            ),
        )
        HideableSections
            .filter { it != AppSection.KilaUnduh || graph.openKilaUnduh != null }
            .filter { it != AppSection.Donate || graph.openDonation != null }
            .forEach { section -> TabVisibilityRow(graph, section) }
    }
}

@Composable
private fun TabVisibilityRow(graph: AppGraph, section: AppSection) {
    val scope = rememberCoroutineScope()
    val setting = remember(section) { AppSettings.hideTab(section.name) }
    val hidden by remember(graph, setting) { graph.settings.flow(setting) }.collectAsState()
    val shown = !hidden
    Row(
        Modifier
            .fillMaxWidth()
            .toggleable(value = shown, role = Role.Checkbox) { scope.launch { graph.settings.put(setting, !it) } }
            .padding(horizontal = DesignSpacing.SettingsRowHorizontal, vertical = DesignSpacing.SettingsRowVertical),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            stringResource(section.label),
            style = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = DesignColors.Ink),
            modifier = Modifier.weight(1f),
        )
        // The row itself is the toggle target; the box only mirrors the state.
        Checkbox(checked = shown, onCheckedChange = null)
    }
}
