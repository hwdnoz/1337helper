import os
import redis

class PromptLoader:
    def __init__(self, defaults_dir='prompts/defaults'):
        self.defaults_dir = defaults_dir
        self._file_cache = {}

    def _load_default(self, prompt_name):
        """Load default prompt from file, with caching"""
        if prompt_name not in self._file_cache:
            path = os.path.join(self.defaults_dir, f'{prompt_name}.txt')
            with open(path, 'r') as f:
                self._file_cache[prompt_name] = f.read()
        return self._file_cache[prompt_name]

    def get(self, prompt_name, **kwargs):
        """
        Get prompt, checking Redis first, then falling back to default file.
        Format with provided kwargs.
        """
        try:
            # Check Redis for edited version
            r = redis.Redis(host='redis', port=6379, db=1, decode_responses=True)
            edited = r.get(f'prompt:{prompt_name}')

            if edited:
                return edited.format(**kwargs)
        except Exception:
            # If Redis fails, continue to default
            pass

        # Fallback to default file
        default = self._load_default(prompt_name)
        return default.format(**kwargs)

    def get_raw(self, prompt_name):
        """Get raw prompt without formatting (for admin UI)"""
        try:
            # Check Redis for edited version
            r = redis.Redis(host='redis', port=6379, db=1, decode_responses=True)
            edited = r.get(f'prompt:{prompt_name}')

            if edited:
                return {'content': edited, 'is_edited': True, 'source': 'redis'}
        except Exception:
            pass

        # Fallback to default file
        default = self._load_default(prompt_name)
        return {'content': default, 'is_edited': False, 'source': 'default'}

    def set(self, prompt_name, content):
        """Save edited prompt to Redis"""
        r = redis.Redis(host='redis', port=6379, db=1, decode_responses=True)
        r.set(f'prompt:{prompt_name}', content)
        return content

    def reset(self, prompt_name):
        """Reset prompt to default by deleting from Redis"""
        r = redis.Redis(host='redis', port=6379, db=1, decode_responses=True)
        r.delete(f'prompt:{prompt_name}')
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
