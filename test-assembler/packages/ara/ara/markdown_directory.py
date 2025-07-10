import os
from pathlib import Path
from typing import List, Dict, Any, Callable, Optional, Union
from dataclasses import dataclass
import fnmatch


@dataclass
class MarkdownFile:
    path: Path
    content: str
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class MarkdownDirectory:
    def __init__(
        self, 
        base_path: Union[str, Path] = ".",
        paths: Optional[List[str]] = None,
        exclude_paths: Optional[List[str]] = None,
        patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None
    ):
        self.base_path = Path(base_path)
        self.paths = paths or []
        self.exclude_paths = exclude_paths or []
        self.patterns = patterns or ["*.md", "*.markdown"]
        self.exclude_patterns = exclude_patterns or []
        self.files: List[MarkdownFile] = []
        self.processed_results: Dict[str, Any] = {}
        
    def _should_include_file(self, file_path: Path) -> bool:
        relative_path = file_path.relative_to(self.base_path)
        path_str = str(relative_path)
        
        # Check if file matches any exclude pattern
        for pattern in self.exclude_patterns:
            if fnmatch.fnmatch(path_str, pattern):
                return False
                
        # Check if file is in any exclude path
        for exclude_path in self.exclude_paths:
            if path_str.startswith(exclude_path.lstrip('/')):
                return False
        
        # Check if file matches any include pattern
        matches_pattern = any(
            fnmatch.fnmatch(file_path.name, pattern) 
            for pattern in self.patterns
        )
        
        if not matches_pattern:
            return False
            
        # If specific paths are provided, check if file is in one of them
        if self.paths:
            in_allowed_path = any(
                path_str.startswith(path.lstrip('/')) 
                for path in self.paths
            )
            return in_allowed_path
            
        return True
        
    def load(self) -> 'MarkdownDirectory':
        self.files = []
        
        for root, dirs, files in os.walk(self.base_path):
            root_path = Path(root)
            
            for file in files:
                file_path = root_path / file
                
                if self._should_include_file(file_path):
                    try:
                        content = file_path.read_text(encoding='utf-8')
                        self.files.append(MarkdownFile(
                            path=file_path,
                            content=content
                        ))
                    except Exception as e:
                        print(f"Error reading {file_path}: {e}")
                        
        print(f"Loaded {len(self.files)} markdown files")
        return self
        
    def apply(self, func: Callable[[MarkdownFile], Any], name: str = None) -> 'MarkdownDirectory':
        if name is None:
            name = func.__name__
            
        results = []
        for file in self.files:
            try:
                result = func(file)
                results.append(result)
                # Store result in file metadata for access by later pipeline steps
                file.metadata[name] = result
            except Exception as e:
                print(f"Error processing {file.path} with {name}: {e}")
                results.append(None)
                
        self.processed_results[name] = results
        return self
        
    def synthesize(self, func: Callable[[List[MarkdownFile], Dict[str, Any]], Any], name: str = None) -> Any:
        if name is None:
            name = func.__name__
            
        result = func(self.files, self.processed_results)
        self.processed_results[name] = result
        return result
        
    def filter(self, predicate: Callable[[MarkdownFile], bool]) -> 'MarkdownDirectory':
        self.files = [f for f in self.files if predicate(f)]
        return self
        
    def get_results(self, step_name: str) -> List[Any]:
        return self.processed_results.get(step_name, [])
        
    def __len__(self) -> int:
        return len(self.files)
        
    def __iter__(self):
        return iter(self.files)
        
    def __getitem__(self, index: int) -> MarkdownFile:
        return self.files[index]