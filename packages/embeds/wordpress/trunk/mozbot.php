<?php

/**
 * Plugin Name:       Mozbot
 * Description:       Convert more with conversational forms
 * Version:           4.0.0
 * Author:            Mozbot
 * Author URI:        http://mozbot.io/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       mozbot
 * Domain Path:       /languages
 */

if (!defined('WPINC')) {
  die();
}

define('MOZBOT_VERSION', '4.0.0');

function activate_mozbot()
{
  require_once plugin_dir_path(__FILE__) .
    'includes/class-mozbot-activator.php';
  Mozbot_Activator::activate();
}

function deactivate_mozbot()
{
  require_once plugin_dir_path(__FILE__) .
    'includes/class-mozbot-deactivator.php';
  Mozbot_Deactivator::deactivate();
}

register_activation_hook(__FILE__, 'activate_mozbot');
register_deactivation_hook(__FILE__, 'deactivate_mozbot');

require plugin_dir_path(__FILE__) . 'includes/class-mozbot.php';

function run_mozbot()
{
  $plugin = new Mozbot();
  $plugin->run();
}
run_mozbot();
