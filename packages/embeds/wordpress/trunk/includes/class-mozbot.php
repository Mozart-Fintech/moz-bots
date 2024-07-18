<?php

class Mozbot
{

	protected $loader;
	protected $plugin_name;
	protected $version;

	public function __construct()
	{
		if (defined('MOZBOT_VERSION')) {
			$this->version = MOZBOT_VERSION;
		} else {
			$this->version = '1.0.0';
		}
		$this->plugin_name = 'mozbot';

		$this->load_dependencies();
		$this->set_locale();
		$this->define_admin_hooks();
		$this->define_public_hooks();
	}

	private function load_dependencies()
	{

		require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-mozbot-loader.php';
		require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-mozbot-i18n.php';
		require_once plugin_dir_path(dirname(__FILE__)) . 'admin/class-mozbot-admin.php';
		require_once plugin_dir_path(dirname(__FILE__)) . 'public/class-mozbot-public.php';

		$this->loader = new Mozbot_Loader();
	}

	private function set_locale()
	{
		$plugin_i18n = new Mozbot_i18n();
		$this->loader->add_action('plugins_loaded', $plugin_i18n, 'load_plugin_textdomain');
	}

	private function define_admin_hooks()
	{
		$plugin_admin = new Mozbot_Admin($this->get_version());
		$this->loader->add_action('admin_menu', $plugin_admin, 'my_admin_menu');
		$this->loader->add_action('admin_init', $plugin_admin, 'register_mozbot_settings');
	}

	private function define_public_hooks()
	{
		$plugin_public = new Mozbot_Public($this->get_plugin_name(), $this->get_version());
		$this->loader->add_action('wp_enqueue_scripts', $plugin_public, 'add_head_code');
		$this->loader->add_shortcode('mozbot', $plugin_public, 'add_mozbot_container');
	}

	public function run()
	{
		$this->loader->run();
	}

	public function get_plugin_name()
	{
		return $this->plugin_name;
	}

	public function get_loader()
	{
		return $this->loader;
	}

	public function get_version()
	{
		return $this->version;
	}
}
