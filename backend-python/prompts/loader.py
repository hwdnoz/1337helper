import os

class PromptLoader:
    def __init__(self, defaults_dir=None):
        if defaults_dir is None:
            # Get directory relative to this file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            defaults_dir = os.path.join(current_dir, 'defaults')
        self.defaults_dir = defaults_dir
        self._file_cache = {}
        self._edited_prompts = {}  # In-memory storage for edited prompts

    def _load_default(self, prompt_name):
        """Load default prompt from file, with caching"""
        if prompt_name not in self._file_cache:
            path = os.path.join(self.defaults_dir, f'{prompt_name}.txt')
            with open(path, 'r') as f:
                self._file_cache[prompt_name] = f.read()
        return self._file_cache[prompt_name]

    def get(self, prompt_name, **kwargs):
        """
        Get prompt, checking in-memory storage first, then falling back to default file.
        Format with provided kwargs.
        """
        # Check in-memory storage for edited version
        if prompt_name in self._edited_prompts:
            return self._edited_prompts[prompt_name].format(**kwargs)

        # Fallback to default file
        default = self._load_default(prompt_name)
        return default.format(**kwargs)

    def get_raw(self, prompt_name):
        """Get raw prompt without formatting (for admin UI)"""
        # Check in-memory storage for edited version
        if prompt_name in self._edited_prompts:
            return {'content': self._edited_prompts[prompt_name], 'is_edited': True, 'source': 'memory'}

        # Fallback to default file
        default = self._load_default(prompt_name)
        return {'content': default, 'is_edited': False, 'source': 'default'}

    def set(self, prompt_name, content):
        """Save edited prompt to in-memory storage"""
        self._edited_prompts[prompt_name] = content
        return content

    def reset(self, prompt_name):
        """Reset prompt to default by removing from in-memory storage"""
        if prompt_name in self._edited_prompts:
            del self._edited_prompts[prompt_name]
        return self._load_default(prompt_name)

    def list_all(self):
        """List all available prompts with their edit status"""
        prompts = []

        # Get all default prompt files
        for filename in os.listdir(self.defaults_dir):
            if filename.endswith('.txt'):
                prompt_name = filename[:-4]  # Remove .txt
                info = self.get_raw(prompt_name)
                prompts.append({
                    'name': prompt_name,
                    'is_edited': info['is_edited'],
                    'source': info['source']
                })

        return prompts

# Global instance
prompts = PromptLoader()
