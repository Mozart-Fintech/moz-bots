<?php
if (!defined('ABSPATH')) {
  exit();
}

class Mozbot_Admin
{
  public function my_admin_menu()
  {
    add_menu_page(
      'Mozbot Settings',
      'Mozbot',
      'manage_options',
      'mozbot/settings.php',
      [$this, 'mozbot_settings_callback'],
      'dashicons-format-chat',
      250
    );
  }

  public function mozbot_settings_callback()
  {
    require_once 'partials/mozbot-admin-display.php';
  }

  public function register_mozbot_settings()
  {
    register_setting('mozbot', 'lib_version');
    register_setting('mozbot', 'init_snippet');
    register_setting('mozbot', 'excluded_pages');
  }
}
