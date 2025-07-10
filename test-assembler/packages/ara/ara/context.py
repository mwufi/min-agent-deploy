import json
from typing import List
from .markdown_directory import MarkdownFile

class Context:
    """A Context can store information, and importantly, contains tools to manipulate it
    
    A Context is passed to an Agent, and the Agent can use the Context to store information, and to call tools to manipulate the Context.
    """
    def __init__(self, name: str):
        self.name = name
        self.data = {}
        self.tools = []
        
    def render(self) -> str:
        """Render the Context as a string"""
        return f"<view id='{self.name}'>\n{json.dumps(self.data, indent=2)}\n</view>"
    
    def __str__(self) -> str:
        return self.render()


class FileTreeContext(Context):
    """A FileTreeContext is a Context that contains a file tree. It stores which folders are expanded/collapsed, as well as any comments on the files/folders.
    
    Example:
    <view id='file-tree'>
    Here is a partial view of the files in:
    /home/zenzen/notes/home/
        notes/
            personal/ (showing 2 of 27 files)
                2025-01-01-personal-note.md (comment: "This is a personal note")
                2025-01-02-personal-note.md
            work/
                2025-01-01-work-note.md
                2025-01-02-work-note.md
    </view>
    <tools id='file-tree-tools'>
        <tool id='expand-folder' name='Expand Folder' description='Expand a folder to see its contents'>
            <parameter name='folder' type='string' description='The folder to expand'>
        </tool>
        <tool id='collapse-folder' name='Collapse Folder' description='Collapse a folder to hide its contents'>
            <parameter name='folder' type='string' description='The folder to collapse'>
        </tool>
        <tool id='comment-file' name='Comment File' description='Comment on a file'>
            <parameter name='file' type='string' description='The file to comment on'>
            <parameter name='comment' type='string' description='The comment to add'>
        </tool>
        <tool id='comment-folder' name='Comment Folder' description='Comment on a folder'>
            <parameter name='folder' type='string' description='The folder to comment on'>
            <parameter name='comment' type='string' description='The comment to add'>
        </tool>
    </tools>
    """
    def __init__(self, name: str, files: List[MarkdownFile]):
        super().__init__(name)
        self.files = files
        self.expanded = {}
        
    def render(self) -> str:
        """Render the Context as a string"""
        return f"<view id='{self.name}'>\n{json.dumps(self.expanded, indent=2)}\n</view>"

