/**
 * AIRWISE — Onboarding Page Accessibility & Component Tests
 * 
 * Tests semantic native HTML controls (radio groups, fieldsets, legends, checkboxes),
 * keyboard navigation, state preservation, and accessibility attributes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PreferencesProvider } from '../store/preferences.js';
import { Onboarding } from './Onboarding.js';

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <PreferencesProvider>
        <Onboarding />
      </PreferencesProvider>
    </MemoryRouter>
  );
}

describe('AIRWISE Onboarding Accessibility & Component Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. City radio group semantics and selected state
  it('implements Step 1 city selection as a native radio group inside fieldset with legend', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    // Verify progressbar has accessible attributes
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-label', 'Onboarding progress');
    expect(progressbar).toHaveAttribute('aria-valuetext', 'Step 1 of 6');

    // Fieldset with legend
    const cityLegend = screen.getByText('Select your city');
    expect(cityLegend.tagName.toLowerCase()).toBe('legend');

    // Radio buttons exist with correct name attribute
    const cityRadios = screen.getAllByRole('radio');
    expect(cityRadios.length).toBeGreaterThanOrEqual(20);
    cityRadios.forEach(radio => {
      expect(radio).toHaveAttribute('name', 'citySelection');
    });

    // Default city is New Delhi
    const delhiRadio = screen.getByRole('radio', { name: /New Delhi/i });
    expect(delhiRadio).toBeChecked();

    // Selecting another city updates selection
    const mumbaiRadio = screen.getByRole('radio', { name: /Mumbai/i });
    expect(mumbaiRadio).not.toBeChecked();

    await user.click(mumbaiRadio);
    expect(mumbaiRadio).toBeChecked();
    expect(delhiRadio).not.toBeChecked();
  });

  // 2. Commute radio group and arrow-key navigation
  it('implements Step 3 commute mode as a native radio group with arrow-key navigation', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    // Step 1 -> Step 2
    await user.click(screen.getByRole('button', { name: /continue/i }));
    // Step 2 -> Step 3
    await user.click(screen.getByRole('button', { name: /continue/i }));

    const commuteLegend = screen.getByText('Primary Commute Mode');
    expect(commuteLegend.tagName.toLowerCase()).toBe('legend');

    const commuteRadios = screen.getAllByRole('radio');
    expect(commuteRadios.length).toBe(8);
    commuteRadios.forEach(radio => {
      expect(radio).toHaveAttribute('name', 'commuteMode');
    });

    // Default commute is Metro Rail
    const metroRadio = screen.getByRole('radio', { name: /Metro Rail/i });
    const busRadio = screen.getByRole('radio', { name: /City Bus/i });
    expect(metroRadio).toBeChecked();
    expect(busRadio).not.toBeChecked();

    // Arrow navigation within native radio group
    metroRadio.focus();
    expect(metroRadio).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(busRadio).toBeChecked();
  });

  // 3. Separate exercise-type and exercise-location groups
  it('implements Step 4 with separate radio groups for exercise type and location', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    // Step 1 -> 2 -> 3 -> 4
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Verify two distinct legends
    const habitLegend = screen.getByText('Primary Exercise Habit');
    const locationLegend = screen.getByText('Where Do You Usually Work Out?');
    expect(habitLegend.tagName.toLowerCase()).toBe('legend');
    expect(locationLegend.tagName.toLowerCase()).toBe('legend');

    // Radios have distinct names
    const habitRadios = screen.getAllByRole('radio').filter(r => r.getAttribute('name') === 'exerciseType');
    const locationRadios = screen.getAllByRole('radio').filter(r => r.getAttribute('name') === 'exerciseLocation');

    expect(habitRadios.length).toBe(7);
    expect(locationRadios.length).toBe(3);

    // Verify selecting 'No Regular Routine' conditionally hides the location group
    const noneRadio = screen.getByRole('radio', { name: /No Regular Routine/i });
    await user.click(noneRadio);
    expect(noneRadio).toBeChecked();
    expect(screen.queryByText('Where Do You Usually Work Out?')).not.toBeInTheDocument();

    // Selecting 'Running / Jogging' restores the location group
    const runningRadio = screen.getByRole('radio', { name: /Running \/ Jogging/i });
    await user.click(runningRadio);
    expect(runningRadio).toBeChecked();
    expect(screen.getByText('Where Do You Usually Work Out?')).toBeInTheDocument();
  });

  // 4. Ventilation radio-group behaviour
  it('implements Step 5 ventilation habits as a native radio group', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    // Step 1 -> 2 -> 3 -> 4 -> 5
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /continue/i }));
    }

    const ventLegend = screen.getByText('Primary Ventilation Habit');
    expect(ventLegend.tagName.toLowerCase()).toBe('legend');

    const ventRadios = screen.getAllByRole('radio').filter(r => r.getAttribute('name') === 'ventilationType');
    expect(ventRadios.length).toBe(4);

    const openWindowsRadio = screen.getByRole('radio', { name: /Open Windows Daily/i });
    const acOnlyRadio = screen.getByRole('radio', { name: /Closed \/ AC Only/i });

    expect(openWindowsRadio).toBeChecked();
    expect(acOnlyRadio).not.toBeChecked();

    await user.click(acOnlyRadio);
    expect(acOnlyRadio).toBeChecked();
    expect(openWindowsRadio).not.toBeChecked();
  });

  // 5. Household purifier and other binary checkbox controls
  it('implements Step 5 purifier and exhaust toggles as accessible native checkboxes', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /continue/i }));
    }

    const purifierCheckbox = screen.getByRole('checkbox', { name: /Do you own a HEPA Air Purifier/i });
    const exhaustCheckbox = screen.getByRole('checkbox', { name: /Kitchen Exhaust Fan or Chimney/i });

    expect(purifierCheckbox).toBeInTheDocument();
    expect(exhaustCheckbox).toBeInTheDocument();

    // Purifier defaults to unchecked, exhaust defaults to checked
    expect(purifierCheckbox).not.toBeChecked();
    expect(exhaustCheckbox).toBeChecked();

    // Click to toggle
    await user.click(purifierCheckbox);
    expect(purifierCheckbox).toBeChecked();

    await user.click(exhaustCheckbox);
    expect(exhaustCheckbox).not.toBeChecked();
  });

  // 6. Step 6 sensitivity checkbox keyboard interaction
  it('implements Step 6 sensitivity cards as keyboard-toggleable native checkboxes', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    // Advance to Step 6
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: /continue/i }));
    }

    const childrenCheckbox = screen.getByRole('checkbox', { name: /Children in household/i });
    const elderlyCheckbox = screen.getByRole('checkbox', { name: /Seniors \/ Elderly members/i });
    const sensitiveCheckbox = screen.getByRole('checkbox', { name: /Members with asthma/i });

    expect(childrenCheckbox).not.toBeChecked();
    expect(elderlyCheckbox).not.toBeChecked();
    expect(sensitiveCheckbox).not.toBeChecked();

    // Keyboard navigation & toggle via Space
    childrenCheckbox.focus();
    expect(childrenCheckbox).toHaveFocus();
    await user.keyboard(' ');
    expect(childrenCheckbox).toBeChecked();

    // Tab to next item
    await user.tab();
    expect(elderlyCheckbox).toHaveFocus();
    await user.keyboard(' ');
    expect(elderlyCheckbox).toBeChecked();

    // Sensitive members remains unchecked
    expect(sensitiveCheckbox).not.toBeChecked();
  });

  // 7. Keyboard focus visibility classes test
  it('applies focus-visible ring classes to card labels for visual accessibility', () => {
    renderOnboarding();

    // Card labels wrap the hidden inputs and include focus-visible utility classes
    const delhiRadio = screen.getByRole('radio', { name: /New Delhi/i });
    const label = delhiRadio.closest('label');
    expect(label).not.toBeNull();
    expect(label?.className).toContain('has-[:focus-visible]:ring-2');
    expect(label?.className).toContain('has-[:focus-visible]:ring-brand-600');
  });

  // 8. Preservation of onboarding selections when navigating between steps
  it('preserves user selections across backward and forward step navigation', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    // Step 1: Pick Bengaluru
    const bengaluruRadio = screen.getByRole('radio', { name: /Bengaluru/i });
    await user.click(bengaluruRadio);
    expect(bengaluruRadio).toBeChecked();

    // Step 1 -> Step 2
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2 -> Step 3
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3: Pick Two-Wheeler
    const motorcycleRadio = screen.getByRole('radio', { name: /Two-Wheeler/i });
    await user.click(motorcycleRadio);
    expect(motorcycleRadio).toBeChecked();

    // Navigate Back to Step 2 then Step 1
    await user.click(screen.getByRole('button', { name: /back/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));

    // Verify Step 1 retained Bengaluru
    const retainedBengaluru = screen.getByRole('radio', { name: /Bengaluru/i });
    expect(retainedBengaluru).toBeChecked();

    // Advance forward again to Step 3
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Verify Step 3 retained Two-Wheeler
    const retainedMotorcycle = screen.getByRole('radio', { name: /Two-Wheeler/i });
    expect(retainedMotorcycle).toBeChecked();
  });
});
